import Koa from "koa";
import Router from "@koa/router";
import crypto from "crypto";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { ROLE } from "../entity/user";
import { getUserUuid } from "../service/passport_service";
import { canManageSubUsersByUuid } from "../service/permission_service";
import { invitationService } from "../service/invitation_service";
import { otpService } from "../service/otp_service";
import type { UserPermissions } from "../entity/entity_interface";
import { emailService } from "../service/email_service";
import userSystem from "../service/user_service";
import subUserService from "../service/sub_user_service";
import { operationLogger } from "../service/operation_logger";
import { logger } from "../service/log";
import Storage from "../common/storage/sys_storage";
import { idempotencyService } from "../service/idempotency_service";
import { singletonMemoryRedis } from "../service/mini_redis";

const router = new Router({ prefix: "/sub-users/invite" });

// Initiate invitation - sends OTP to owner for verification
router.post(
  "/initiate",
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, instanceUuid: String },
    body: { inviteeEmail: String, expiryMinutes: Number }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;
    const { inviteeEmail, permissions, expiryMinutes, instanceName } = ctx.request.body;

    // Validate expiry
    if (expiryMinutes !== 30 && expiryMinutes !== 60) {
      ctx.throw(400, "Expiry must be 30 or 60 minutes");
    }

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to invite sub-users for this instance");
    }

    // Get parent user
    const parentUser = userSystem.getInstance(userUuid);
    if (!parentUser) {
      ctx.throw(404, "User not found");
      return;
    }

    // Check if parent has email set and verified
    if (!parentUser.email || !parentUser.emailVerified) {
      ctx.throw(400, "You must have a verified email to invite sub-users");
    }

    // Check if there's already a pending invitation for this invitee + instance
    if (invitationService.hasPendingInvitation(inviteeEmail, String(instanceUuid))) {
      ctx.throw(400, "There is already a pending invitation for this email and instance");
    }

    // Rate limit check
    if (!otpService.checkRateLimit(`invite:${userUuid}`, 5, 3600000)) {
      ctx.throw(429, "Too many invitation attempts. Please wait before trying again.");
    }

    // Validate permissions object - use UserPermissions format
    const validPermissions: UserPermissions = {
      canUploadFiles: Boolean(permissions?.canUploadFiles ?? true),
      canDownloadFiles: Boolean(permissions?.canDownloadFiles ?? true),
      canDeleteFiles: Boolean(permissions?.canDeleteFiles ?? false),
      canModifyFiles: Boolean(permissions?.canModifyFiles ?? true),
      canAccessConsole: Boolean(permissions?.canAccessConsole ?? true),
      canStartInstances: Boolean(permissions?.canStartInstances ?? true),
      canRestartInstances: Boolean(permissions?.canRestartInstances ?? true),
      canStopInstances: Boolean(permissions?.canStopInstances ?? true),
      canTerminateInstances: Boolean(permissions?.canTerminateInstances ?? false),
      canViewLogs: Boolean(permissions?.canViewLogs ?? true),
      canAccessConfigFiles: Boolean(permissions?.canAccessConfigFiles ?? false),
      canAccessFileManager: Boolean(permissions?.canAccessFileManager ?? true),
      canAccessMinecraftQuery: Boolean(permissions?.canAccessMinecraftQuery ?? true),
      canAccessTerminalSettings: Boolean(permissions?.canAccessTerminalSettings ?? false),
      canAccessScheduledTasks: Boolean(permissions?.canAccessScheduledTasks ?? false),
      canAccessEventTasks: Boolean(permissions?.canAccessEventTasks ?? false),
      canAccessInstanceSettings: Boolean(permissions?.canAccessInstanceSettings ?? false),
      canAccessServerMarket: Boolean(permissions?.canAccessServerMarket ?? false),
      disableRightClick: Boolean(permissions?.disableRightClick ?? false),
      disableKeyboardShortcuts: Boolean(permissions?.disableKeyboardShortcuts ?? false),
      disableTextSelection: Boolean(permissions?.disableTextSelection ?? false),
      disableCopy: Boolean(permissions?.disableCopy ?? false),
      disablePaste: Boolean(permissions?.disablePaste ?? false)
    };

    // Generate idempotency key from request parameters
    const idempotencyKey = ctx.request.headers["idempotency-key"] as string ||
      crypto.createHash("sha256")
        .update(`${userUuid}:${inviteeEmail}:${instanceUuid}`)
        .digest("hex");

    // Process with idempotency to prevent duplicate requests
    const { result, cached } = await idempotencyService.processIdempotent(
      idempotencyKey,
      async () => {
        // Store pending invitation
        const pendingKey = invitationService.storePendingInvitation(
          userUuid,
          parentUser.email,
          parentUser.userName,
          String(inviteeEmail).toLowerCase().trim(),
          String(daemonId),
          String(instanceUuid),
          String(instanceName || "Instance"),
          validPermissions,
          expiryMinutes
        );

        // Create and send OTP to owner
        const otp = await otpService.createInvitationOTP(parentUser.email, userUuid);

        // Send OTP email to owner
        const emailSent = await emailService.sendOTP(
          parentUser.email,
          otp,
          "registration", // Using registration template for visual consistency
          parentUser.firstName
        );

        if (!emailSent) {
          throw new Error("Failed to send verification email. Please try again.");
        }

        logger.info(`[Invitation] OTP sent to ${parentUser.email} for invitation to ${inviteeEmail}`);

        return { pendingKey };
      },
      300 // 5 minute TTL for idempotency
    );

    ctx.body = {
      success: true,
      message: cached ? "Request already in progress" : "Verification code sent to your email",
      pendingKey: result.pendingKey,
      cached
    };
  }
);

// Verify owner OTP and send invitation to invitee
router.post(
  "/verify-owner",
  permission({ level: ROLE.USER }),
  validator({ body: { pendingKey: String, otp: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { pendingKey, otp } = ctx.request.body;

    // Get parent user
    const parentUser = userSystem.getInstance(userUuid);
    if (!parentUser || !parentUser.email) {
      ctx.throw(404, "User not found");
      return;
    }

    // Verify OTP
    const otpRecord = await otpService.verifyOTP(parentUser.email, String(otp), "invitation");
    if (!otpRecord) {
      ctx.throw(400, "Invalid or expired verification code");
    }

    // Create the actual invitation
    const invitation = invitationService.createInvitationAfterOtpVerification(String(pendingKey));
    if (!invitation) {
      ctx.throw(400, "Invitation request expired. Please start again.");
    }

    // Send invitation email to invitee
    const emailSent = await emailService.sendInvitationEmail(
      invitation.inviteeEmail,
      invitation.parentUserName,
      invitation.instanceName,
      invitation.token,
      invitation.expiryMinutes
    );

    if (!emailSent) {
      logger.error(`[Invitation] Failed to send invitation email to ${invitation.inviteeEmail}`);
      // Don't fail - invitation is still created
    }

    operationLogger.log("sub_user_invite", {
      operator_ip: ctx.ip,
      operator_name: parentUser.userName,
      target_email: invitation.inviteeEmail,
      instance_uuid: invitation.instanceUuid
    });

    ctx.body = {
      success: true,
      invitation: {
        invitationId: invitation.invitationId,
        inviteeEmail: invitation.inviteeEmail,
        instanceName: invitation.instanceName,
        expiresAt: invitation.expiresAt
      }
    };
  }
);

// Verify invitation token (query param version for frontend)
// Supports both new invitation service and legacy Redis-based invitations
router.get(
  "/verify",
  async (ctx: Koa.ParameterizedContext) => {
    const token = ctx.query.token as string;
    logger.info(`[Invitation] /verify endpoint called with token: ${token}`);

    if (!token) {
      logger.error("[Invitation] /verify - No token provided");
      ctx.throw(400, "Token is required");
      return;
    }

    // Try new invitation service first
    let invitation = invitationService.getInvitationByToken(String(token));

    if (invitation) {
      // Found in new system
      const existingUser = userSystem.getUserByEmail(invitation.inviteeEmail);
      logger.info(`[Invitation] /verify - Found invitation in new system for ${invitation.inviteeEmail}, hasAccount: ${!!existingUser}`);

      ctx.body = {
        email: invitation.inviteeEmail,
        inviterName: invitation.parentUserName,
        instanceName: invitation.instanceName,
        expiresAt: invitation.expiresAt,
        hasAccount: !!existingUser
      };
      return;
    }

    // Fallback to legacy Redis storage (old invitation system)
    logger.info(`[Invitation] /verify - Not found in new system, checking legacy Redis storage`);
    const inviteKey = `invite:${token}`;
    const stored = singletonMemoryRedis.get<{ value: any }>(inviteKey);

    if (!stored || !stored.value) {
      logger.error(`[Invitation] /verify - Invitation not found in either system for token: ${token}`);
      ctx.throw(404, "Invitation not found or expired");
      return;
    }

    const legacyInvite = stored.value;

    // Check if expired
    if (Date.now() > legacyInvite.expiresAt) {
      logger.error(`[Invitation] /verify - Legacy invitation expired for token: ${token}`);
      ctx.throw(404, "Invitation not found or expired");
      return;
    }

    const existingUser = userSystem.getUserByEmail(legacyInvite.inviteeEmail);
    logger.info(`[Invitation] /verify - Found legacy invitation for ${legacyInvite.inviteeEmail}, hasAccount: ${!!existingUser}`);

    ctx.body = {
      email: legacyInvite.inviteeEmail,
      inviterName: legacyInvite.parentName,
      instanceName: legacyInvite.instanceName,
      expiresAt: legacyInvite.expiresAt,
      hasAccount: !!existingUser
    };
  }
);

// Get invitation details (for accept page)
router.get(
  "/details/:token",
  async (ctx: Koa.ParameterizedContext) => {
    const { token } = ctx.params;

    const invitation = invitationService.getInvitationByToken(String(token));
    if (!invitation) {
      ctx.throw(404, "Invitation not found or expired");
      return;
    }

    // Check if invitee has an account
    const existingUser = userSystem.getUserByEmail(invitation.inviteeEmail);

    ctx.body = {
      inviteeEmail: invitation.inviteeEmail,
      parentUserName: invitation.parentUserName,
      instanceName: invitation.instanceName,
      expiresAt: invitation.expiresAt,
      hasAccount: !!existingUser
    };
  }
);

// Accept invitation (for existing users) - supports both body and path parameter
// Supports both new invitation service and legacy Redis-based invitations
// Existing users can accept invitations - they become sub-users for this specific instance
// while remaining full owners of their own instances
router.post(
  "/accept/:token?",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    // Support both path param and body token
    const token = ctx.params.token || ctx.request.body?.token;

    if (!token) {
      ctx.throw(400, "Token is required");
      return;
    }

    // Get current user
    const currentUser = userSystem.getInstance(userUuid);
    if (!currentUser) {
      ctx.throw(404, "User not found");
      return;
    }

    // Try new invitation service first
    let invitation = invitationService.getInvitationByToken(String(token));

    if (invitation) {
      // Found in new system - verify email matches
      if (
        !currentUser.email ||
        currentUser.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()
      ) {
        ctx.throw(403, "This invitation was sent to a different email address");
      }

      try {
        await subUserService.addExistingUserAsSubUser(
          invitation.parentUserId,
          invitation.instanceUuid,
          invitation.daemonId,
          userUuid,
          invitation.permissions
        );

        invitationService.acceptInvitation(invitation.invitationId);

        operationLogger.log("sub_user_accept_invite", {
          operator_ip: ctx.ip,
          operator_name: currentUser.userName,
          parent_name: invitation.parentUserName,
          instance_uuid: invitation.instanceUuid
        });

        logger.info(`[Invitation] Existing user ${currentUser.userName} accepted invitation from ${invitation.parentUserName}`);

        ctx.body = {
          success: true,
          message: "Invitation accepted successfully. You now have access to the instance."
        };
        return;
      } catch (error: any) {
        logger.error(`[Invitation] Failed to accept invitation: ${error.message}`);
        ctx.throw(400, error.message);
      }
    }

    // Fallback to legacy Redis storage
    const inviteKey = `invite:${token}`;
    const stored = singletonMemoryRedis.get<{ value: any }>(inviteKey);

    if (!stored || !stored.value) {
      ctx.throw(404, "Invitation not found or expired");
      return;
    }

    const legacyInvite = stored.value;

    // Check if expired
    if (Date.now() > legacyInvite.expiresAt) {
      ctx.throw(404, "Invitation expired");
      return;
    }

    // Verify email matches
    if (
      !currentUser.email ||
      currentUser.email.toLowerCase() !== legacyInvite.inviteeEmail.toLowerCase()
    ) {
      ctx.throw(403, "This invitation was sent to a different email address");
    }

    try {
      await subUserService.addExistingUserAsSubUser(
        legacyInvite.parentUuid,
        legacyInvite.instanceUuid,
        legacyInvite.daemonId,
        userUuid,
        legacyInvite.permissions
      );

      // Clear the invite from Redis
      singletonMemoryRedis.set(inviteKey, null, 0);

      operationLogger.log("sub_user_accept_invite", {
        operator_ip: ctx.ip,
        operator_name: currentUser.userName,
        parent_name: legacyInvite.parentName,
        instance_uuid: legacyInvite.instanceUuid
      });

      logger.info(`[Invitation] Existing user ${currentUser.userName} accepted legacy invitation from ${legacyInvite.parentName}`);

      ctx.body = {
        success: true,
        message: "Invitation accepted successfully. You now have access to the instance."
      };
    } catch (error: any) {
      logger.error(`[Invitation] Failed to accept legacy invitation: ${error.message}`);
      ctx.throw(400, error.message);
    }
  }
);

// Register new user via invitation (no OTP needed - link click = email verification)
// Supports both /accept-register and /register/:token paths
router.post(
  "/accept-register",
  validator({
    body: { token: String, userName: String, password: String, firstName: String, lastName: String }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const { token, userName, password, firstName, lastName, location } = ctx.request.body;

    const invitation = invitationService.getInvitationByToken(String(token));
    if (!invitation) {
      ctx.throw(404, "Invitation not found or expired");
      return;
    }

    // Validate username
    if (userSystem.existUserName(String(userName))) {
      ctx.throw(400, "Username already exists");
    }

    // Validate password
    if (!userSystem.validatePassword(String(password))) {
      ctx.throw(
        400,
        "Password must be 9-36 characters and contain uppercase, lowercase, and numbers"
      );
    }

    // Check if email already registered
    if (userSystem.getUserByEmail(invitation.inviteeEmail)) {
      ctx.throw(400, "An account with this email already exists. Please log in and accept the invitation.");
    }

    try {
      // Create the new user (regular user - sub-user status is per-instance)
      // Note: userSystem.create automatically hashes the password via edit()
      const newUser = await userSystem.create({
        userName: String(userName),
        passWord: String(password),
        permission: 1, // USER role
        email: invitation.inviteeEmail,
        emailVerified: true, // Clicking the link = email verified
        firstName: String(firstName),
        lastName: String(lastName),
        location: String(location),
        createdIp: ctx.ip
      });

      // Assign the instance
      await userSystem.edit(newUser.uuid, {
        instances: [{ instanceUuid: invitation.instanceUuid, daemonId: invitation.daemonId }]
      });

      // Update parent's subUsers array with per-instance permissions
      const parentUser = userSystem.getInstance(invitation.parentUserId);
      if (parentUser) {
        parentUser.subUsers.push({
          uuid: newUser.uuid,
          instanceUuid: invitation.instanceUuid,
          daemonId: invitation.daemonId,
          permissions: invitation.permissions
        });
        await Storage.getStorage().store("User", parentUser.uuid, parentUser);
      }

      // Mark invitation as accepted
      invitationService.acceptInvitation(invitation.invitationId);

      // Send welcome email
      await emailService.sendWelcomeEmail(invitation.inviteeEmail, String(firstName));

      operationLogger.log("sub_user_register_via_invite", {
        operator_ip: ctx.ip,
        operator_name: String(userName),
        parent_name: invitation.parentUserName,
        instance_uuid: invitation.instanceUuid
      });

      logger.info(`[Invitation] New user ${userName} registered via invitation from ${invitation.parentUserName}`);

      ctx.body = {
        success: true,
        message: "Account created successfully. You can now log in."
      };
    } catch (error: any) {
      logger.error(`[Invitation] Failed to register via invitation: ${error.message}`);
      ctx.throw(500, error.message);
    }
  }
);

// Get pending invitations for current user (as owner)
router.get(
  "/list",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);

    const invitations = invitationService.getAllInvitationsByParent(userUuid);

    ctx.body = invitations.map((inv) => ({
      invitationId: inv.invitationId,
      inviteeEmail: inv.inviteeEmail,
      instanceName: inv.instanceName,
      instanceUuid: inv.instanceUuid,
      daemonId: inv.daemonId,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt
    }));
  }
);

// Cancel invitation
router.del(
  "/:invitationId",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { invitationId } = ctx.params;

    const success = invitationService.cancelInvitation(String(invitationId), userUuid);
    if (!success) {
      ctx.throw(400, "Unable to cancel invitation");
    }

    ctx.body = { success: true };
  }
);

export default router;
