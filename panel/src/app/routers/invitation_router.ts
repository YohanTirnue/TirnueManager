import Koa from "koa";
import Router from "@koa/router";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { ROLE } from "../entity/user";
import { getUserUuid } from "../service/passport_service";
import { canManageSubUsersByUuid } from "../service/permission_service";
import { invitationService, type InvitationPermissions } from "../service/invitation_service";
import { otpService } from "../service/otp_service";
import { emailService } from "../service/email_service";
import userSystem from "../service/user_service";
import subUserService from "../service/sub_user_service";
import { operationLogger } from "../service/operation_logger";
import { logger } from "../service/log";
import Storage from "../common/storage/sys_storage";

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

    // Validate permissions object
    const validPermissions: InvitationPermissions = {
      canStart: Boolean(permissions?.canStart),
      canStop: Boolean(permissions?.canStop),
      canRestart: Boolean(permissions?.canRestart),
      canKill: Boolean(permissions?.canKill),
      canTerminal: Boolean(permissions?.canTerminal),
      canFileManager: Boolean(permissions?.canFileManager),
      canFileEdit: Boolean(permissions?.canFileEdit),
      canSchedule: Boolean(permissions?.canSchedule)
    };

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
      ctx.throw(500, "Failed to send verification email. Please try again.");
    }

    logger.info(`[Invitation] OTP sent to ${parentUser.email} for invitation to ${inviteeEmail}`);

    ctx.body = {
      success: true,
      message: "Verification code sent to your email",
      pendingKey
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

// Accept invitation (for existing users)
// Existing users can accept invitations - they become sub-users for this specific instance
// while remaining full owners of their own instances
router.post(
  "/accept/:token",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { token } = ctx.params;

    const invitation = invitationService.getInvitationByToken(String(token));
    if (!invitation) {
      ctx.throw(404, "Invitation not found or expired");
      return;
    }

    // Get current user
    const currentUser = userSystem.getInstance(userUuid);
    if (!currentUser) {
      ctx.throw(404, "User not found");
      return;
    }

    // Verify the logged-in user's email matches the invitation
    if (
      !currentUser.email ||
      currentUser.email.toLowerCase() !== invitation.inviteeEmail.toLowerCase()
    ) {
      ctx.throw(403, "This invitation was sent to a different email address");
    }

    try {
      // Map invitation permissions to UserPermissions format
      const userPermissions = {
        canStartInstances: invitation.permissions.canStart,
        canStopInstances: invitation.permissions.canStop,
        canRestartInstances: invitation.permissions.canRestart,
        canTerminateInstances: invitation.permissions.canKill,
        canAccessConsole: invitation.permissions.canTerminal,
        canAccessFileManager: invitation.permissions.canFileManager,
        canModifyFiles: invitation.permissions.canFileEdit,
        canAccessScheduledTasks: invitation.permissions.canSchedule,
        // Default file permissions
        canUploadFiles: invitation.permissions.canFileManager,
        canDownloadFiles: invitation.permissions.canFileManager,
        canDeleteFiles: false,
        canViewLogs: true,
        canAccessConfigFiles: false,
        canAccessMinecraftQuery: true,
        canAccessTerminalSettings: false,
        canAccessEventTasks: false,
        canAccessInstanceSettings: false,
        canAccessServerMarket: false,
        disableRightClick: false,
        disableKeyboardShortcuts: false,
        disableTextSelection: false,
        disableCopy: false,
        disablePaste: false
      };

      // Add existing user as sub-user for this instance
      await subUserService.addExistingUserAsSubUser(
        invitation.parentUserId,
        invitation.instanceUuid,
        invitation.daemonId,
        userUuid,
        userPermissions
      );

      // Mark invitation as accepted
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
    } catch (error: any) {
      logger.error(`[Invitation] Failed to accept invitation: ${error.message}`);
      ctx.throw(400, error.message);
    }
  }
);

// Register new user via invitation (no OTP needed - link click = email verification)
router.post(
  "/register/:token",
  validator({
    body: { userName: String, password: String, firstName: String, lastName: String, location: String }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const { token } = ctx.params;
    const { userName, password, firstName, lastName, location } = ctx.request.body;

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
      // Map invitation permissions to UserPermissions format
      // Note: userSystem.create automatically hashes the password via edit()
      const userPermissions = {
        canStartInstances: invitation.permissions.canStart,
        canStopInstances: invitation.permissions.canStop,
        canRestartInstances: invitation.permissions.canRestart,
        canTerminateInstances: invitation.permissions.canKill,
        canAccessConsole: invitation.permissions.canTerminal,
        canAccessFileManager: invitation.permissions.canFileManager,
        canModifyFiles: invitation.permissions.canFileEdit,
        canAccessScheduledTasks: invitation.permissions.canSchedule,
        // Default file permissions
        canUploadFiles: invitation.permissions.canFileManager,
        canDownloadFiles: invitation.permissions.canFileManager,
        canDeleteFiles: false,
        canViewLogs: true,
        canAccessConfigFiles: false,
        canAccessMinecraftQuery: true,
        canAccessTerminalSettings: false,
        canAccessEventTasks: false,
        canAccessInstanceSettings: false,
        canAccessServerMarket: false,
        disableRightClick: false,
        disableKeyboardShortcuts: false,
        disableTextSelection: false,
        disableCopy: false,
        disablePaste: false
      };

      // Create the new user (regular user - sub-user status is per-instance)
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
          permissions: userPermissions
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
