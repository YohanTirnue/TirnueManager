import Koa from "koa";
import Router from "@koa/router";
import { v4 as uuidv4 } from "uuid";
import permission from "../middleware/permission";
import validator from "../middleware/validator";
import { ROLE, type User } from "../entity/user";
import { getUserUuid } from "../service/passport_service";
import {
  canManageSubUsersByUuid,
  isTopPermissionByUuid
} from "../service/permission_service";
import subUserService from "../service/sub_user_service";
import userSystem from "../service/user_service";
import { operationLogger } from "../service/operation_logger";
import { $t } from "../i18n";
import { singletonMemoryRedis } from "../service/mini_redis";
import { emailService } from "../service/email_service";
import RemoteServiceSubsystem from "../service/remote_service";
import { otpService } from "../service/otp_service";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Interface for invite data stored in Redis
interface InviteData {
  token: string;
  inviteeEmail: string;
  parentUuid: string;
  parentName: string;
  instanceUuid: string;
  daemonId: string;
  instanceName: string;
  permissions: any;
  expiresAt: number;
}

const router = new Router({ prefix: "/sub-users" });

// Get all sub-users for a specific instance
router.get(
  "/",
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to manage sub-users for this instance");
    }

    // If admin, get ALL sub-users for this instance from all parents
    // If regular user, get only their own sub-users
    let subUserEntries: Array<{ user: User; permissions: any }>;
    if (isTopPermissionByUuid(userUuid)) {
      const teams = subUserService.getInstanceTeam(String(instanceUuid), String(daemonId));
      // Flatten teams to get all sub-users
      subUserEntries = [];
      for (const team of teams) {
        subUserEntries.push(...team.subUsers);
      }
    } else {
      subUserEntries = subUserService.getSubUsers(
        userUuid,
        String(instanceUuid),
        String(daemonId)
      );
    }

    // Remove sensitive data - permissions are now per-instance
    const sanitizedSubUsers = subUserEntries.map((entry) => ({
      uuid: entry.user.uuid,
      userName: entry.user.userName,
      email: entry.user.email,
      firstName: entry.user.firstName,
      lastName: entry.user.lastName,
      registerTime: entry.user.registerTime,
      loginTime: entry.user.loginTime,
      permissions: entry.permissions // Per-instance permissions
    }));

    ctx.body = sanitizedSubUsers;
  }
);

// Get team structure for an instance (admin only)
router.get(
  "/teams",
  permission({ level: ROLE.ADMIN }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { daemonId, instanceUuid } = ctx.query;

    const teams = subUserService.getInstanceTeam(String(instanceUuid), String(daemonId));

    // Sanitize data - now includes per-instance permissions
    const sanitizedTeams = teams.map((team) => ({
      parent: {
        uuid: team.parent.uuid,
        userName: team.parent.userName,
        permission: team.parent.permission
      },
      subUsers: team.subUsers.map((entry) => ({
        uuid: entry.user.uuid,
        userName: entry.user.userName,
        email: entry.user.email,
        firstName: entry.user.firstName,
        lastName: entry.user.lastName,
        permissions: entry.permissions, // Per-instance permissions
        registerTime: entry.user.registerTime,
        loginTime: entry.user.loginTime
      }))
    }));

    ctx.body = sanitizedTeams;
  }
);

// Get parent users (owners) who have access to an instance (admin only)
router.get(
  "/parents",
  permission({ level: ROLE.ADMIN }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { daemonId, instanceUuid } = ctx.query;

    const parentUsers = [];
    for (const [uuid, user] of userSystem.objects) {
      // Check if user is an owner of this instance (not a sub-user for it)
      if (subUserService.isInstanceOwner(uuid, String(instanceUuid), String(daemonId))) {
        parentUsers.push({
          uuid: user.uuid,
          userName: user.userName,
          permission: user.permission
        });
      }
    }

    ctx.body = parentUsers;
  }
);

// Create a sub-user
router.post(
  "/",
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, instanceUuid: String },
    body: { userName: String, passWord: String, permissions: Object }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;
    const { userName, passWord, permissions, parentUuid } = ctx.request.body;

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to manage sub-users for this instance");
    }

    // Determine the parent: if admin and parentUuid provided, use it; otherwise use current user
    let actualParentUuid = userUuid;
    if (isTopPermissionByUuid(userUuid)) {
      // Admins must specify a parent user
      if (!parentUuid) {
        ctx.throw(400, "Admin must specify parentUuid when creating sub-users");
      }
      actualParentUuid = String(parentUuid);
    }

    // Build full UserPermissions object with defaults for missing fields
    const fullPermissions = {
      canUploadFiles: Boolean(permissions?.canUploadFiles),
      canDownloadFiles: Boolean(permissions?.canDownloadFiles),
      canDeleteFiles: Boolean(permissions?.canDeleteFiles),
      canModifyFiles: Boolean(permissions?.canModifyFiles),
      canAccessConsole: Boolean(permissions?.canAccessConsole),
      canStartInstances: Boolean(permissions?.canStartInstances),
      canRestartInstances: Boolean(permissions?.canRestartInstances),
      canStopInstances: Boolean(permissions?.canStopInstances),
      canTerminateInstances: Boolean(permissions?.canTerminateInstances),
      canViewLogs: permissions?.canViewLogs !== false, // Default true
      canAccessConfigFiles: Boolean(permissions?.canAccessConfigFiles),
      canAccessFileManager: Boolean(permissions?.canAccessFileManager),
      canAccessMinecraftQuery: Boolean(permissions?.canAccessMinecraftQuery),
      canAccessTerminalSettings: Boolean(permissions?.canAccessTerminalSettings),
      canAccessScheduledTasks: Boolean(permissions?.canAccessScheduledTasks),
      canAccessEventTasks: Boolean(permissions?.canAccessEventTasks),
      canAccessInstanceSettings: Boolean(permissions?.canAccessInstanceSettings),
      canAccessServerMarket: Boolean(permissions?.canAccessServerMarket),
      disableRightClick: Boolean(permissions?.disableRightClick),
      disableKeyboardShortcuts: Boolean(permissions?.disableKeyboardShortcuts),
      disableTextSelection: Boolean(permissions?.disableTextSelection),
      disableCopy: Boolean(permissions?.disableCopy),
      disablePaste: Boolean(permissions?.disablePaste)
    };

    try {
      const subUser = await subUserService.createSubUser(
        actualParentUuid,
        String(instanceUuid),
        String(daemonId),
        {
          userName: String(userName),
          passWord: String(passWord),
          permissions: fullPermissions
        }
      );

      operationLogger.log("sub_user_create", {
        operator_ip: ctx.ip,
        operator_name: String(ctx.session?.["userName"] || ""),
        target_user_name: subUser.userName,
        instance_uuid: String(instanceUuid)
      });

      ctx.body = {
        uuid: subUser.uuid,
        userName: subUser.userName,
        registerTime: subUser.registerTime,
        permissions: fullPermissions // Return the per-instance permissions
      };
    } catch (error: any) {
      ctx.throw(400, error.message);
    }
  }
);

// Update sub-user permissions for a specific instance
router.put(
  "/:subUserUuid",
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, instanceUuid: String },
    body: { permissions: Object }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { subUserUuid } = ctx.params;
    const { daemonId, instanceUuid } = ctx.query;
    const { permissions } = ctx.request.body;

    const subUser = userSystem.getInstance(String(subUserUuid));
    if (!subUser) {
      ctx.throw(404, "User not found");
      return;
    }

    // Check if this user is a sub-user for this specific instance
    const entry = subUserService.getSubUserEntry(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );
    if (!entry) {
      ctx.throw(404, "User is not a sub-user for this instance");
      return;
    }

    // Find the parent for this sub-user entry
    const parent = subUserService.getParentForInstance(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );

    // Parent must exist (data consistency check)
    if (!parent) {
      ctx.throw(500, "Data inconsistency: could not find parent for this sub-user entry");
      return;
    }

    // Allow if user is admin OR if user is the parent
    if (!isTopPermissionByUuid(userUuid) && parent.uuid !== userUuid) {
      ctx.throw(403, "You do not have permission to modify this sub-user");
      return;
    }

    try {
      await subUserService.updateSubUserPermissions(
        parent.uuid,
        String(subUserUuid),
        String(instanceUuid),
        String(daemonId),
        permissions
      );

      operationLogger.log("sub_user_update", {
        operator_ip: ctx.ip,
        operator_name: String(ctx.session?.["userName"] || ""),
        target_user_uuid: subUserUuid,
        instance_uuid: String(instanceUuid)
      });

      ctx.body = { success: true };
    } catch (error: any) {
      ctx.throw(403, error.message);
    }
  }
);

// Remove a sub-user from a specific instance
router.del(
  "/:subUserUuid",
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { subUserUuid } = ctx.params;
    const { daemonId, instanceUuid } = ctx.query;

    const subUser = userSystem.getInstance(String(subUserUuid));
    if (!subUser) {
      ctx.throw(404, "User not found");
      return;
    }

    const subUserName = subUser.userName || "Unknown";

    // Check if this user is a sub-user for this specific instance
    const entry = subUserService.getSubUserEntry(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );
    if (!entry) {
      ctx.throw(404, "User is not a sub-user for this instance");
      return;
    }

    // Find the parent for this sub-user entry
    const parent = subUserService.getParentForInstance(
      String(subUserUuid),
      String(instanceUuid),
      String(daemonId)
    );

    // Parent must exist (data consistency check)
    if (!parent) {
      ctx.throw(500, "Data inconsistency: could not find parent for this sub-user entry");
      return;
    }

    // Allow if user is admin OR if user is the parent
    if (!isTopPermissionByUuid(userUuid) && parent.uuid !== userUuid) {
      ctx.throw(403, "You do not have permission to remove this sub-user");
      return;
    }

    try {
      await subUserService.removeSubUserFromInstance(
        parent.uuid,
        String(subUserUuid),
        String(instanceUuid),
        String(daemonId)
      );

      operationLogger.log(
        "sub_user_delete",
        {
          operator_ip: ctx.ip,
          operator_name: String(ctx.session?.["userName"] || ""),
          target_user_name: subUserName,
          target_user_uuid: subUserUuid,
          instance_uuid: String(instanceUuid)
        },
        "warning"
      );

      ctx.body = { success: true };
    } catch (error: any) {
      ctx.throw(403, error.message);
    }
  }
);

// ==================== INVITE ENDPOINTS ====================

// Initiate an invitation - send email with invite link
router.post(
  "/invite/initiate",
  permission({ level: ROLE.USER }),
  validator({
    query: { daemonId: String, instanceUuid: String },
    body: { inviteeEmail: String, permissions: Object, expiryMinutes: Number }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;
    const { inviteeEmail, permissions, expiryMinutes, parentUuid } = ctx.request.body;

    // Rate limit: 5 invites per hour per user
    if (!otpService.checkRateLimit(`invite:${userUuid}`, 5, 3600000)) {
      ctx.throw(429, "Too many invitations. Please wait before sending more.");
    }

    // Validate email format
    if (!EMAIL_REGEX.test(inviteeEmail)) {
      ctx.throw(400, "Invalid email format");
    }

    // Check if user can manage sub-users for this instance
    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to invite sub-users for this instance");
    }

    // Determine the parent
    let actualParentUuid = userUuid;
    if (isTopPermissionByUuid(userUuid)) {
      if (!parentUuid) {
        ctx.throw(400, "Admin must specify parentUuid when inviting sub-users");
      }
      actualParentUuid = String(parentUuid);
    }

    const parentUser = userSystem.getInstance(actualParentUuid);
    if (!parentUser) {
      ctx.throw(400, "Parent user not found");
    }

    // Use instanceUuid as name (getting instance name would require async request)
    const instanceName = String(instanceUuid);

    // Generate invite token
    const token = uuidv4();
    const expiryMs = (expiryMinutes || 60) * 60 * 1000;

    // Store invite data in Redis
    const inviteData: InviteData = {
      token,
      inviteeEmail: String(inviteeEmail).toLowerCase(),
      parentUuid: actualParentUuid,
      parentName: parentUser.userName,
      instanceUuid: String(instanceUuid),
      daemonId: String(daemonId),
      instanceName,
      permissions,
      expiresAt: Date.now() + expiryMs
    };

    singletonMemoryRedis.set(`invite:${token}`, inviteData, expiryMinutes * 60);

    // Also store in instance's invite list for queryability
    const listKey = `invite_list:${daemonId}:${instanceUuid}`;
    const existingList = singletonMemoryRedis.get<{ value: string[] }>(listKey);
    const tokenList = existingList?.value || [];
    tokenList.push(token);
    // Store list with longer TTL (24 hours) - individual invites have their own expiry
    singletonMemoryRedis.set(listKey, tokenList, 86400);

    // Send invitation email
    const emailSent = await emailService.sendInvitationEmail(
      String(inviteeEmail),
      parentUser.userName,
      instanceName,
      token,
      expiryMinutes
    );

    if (!emailSent) {
      singletonMemoryRedis.set(`invite:${token}`, null, 0); // Clean up
      ctx.throw(500, "Failed to send invitation email");
    }

    operationLogger.log("sub_user_invite", {
      operator_ip: ctx.ip,
      operator_name: String(ctx.session?.["userName"] || ""),
      invitee_email: inviteeEmail,
      instance_uuid: String(instanceUuid)
    });

    ctx.body = {
      success: true,
      message: "Invitation sent successfully",
      expiresAt: inviteData.expiresAt
    };
  }
);

// Verify invite token - returns invite details and whether email has account
router.get(
  "/invite/verify",
  async (ctx: Koa.ParameterizedContext) => {
    const { token } = ctx.query;

    // Rate limit: 10 verifications per minute per IP
    if (!otpService.checkRateLimit(`verify:${ctx.ip}`, 10, 60000)) {
      ctx.throw(429, "Too many requests. Please wait.");
    }

    if (!token) {
      ctx.throw(400, "Token is required");
    }

    const inviteKey = `invite:${token}`;
    const stored = singletonMemoryRedis.get<{ value: InviteData }>(inviteKey);

    if (!stored || !stored.value) {
      ctx.throw(404, "Invalid or expired invitation");
    }

    const inviteData = stored.value;

    // Check if expired
    if (Date.now() > inviteData.expiresAt) {
      ctx.throw(410, "Invitation has expired");
    }

    // Check if email already has an account
    let hasAccount = false;
    let existingUserUuid: string | null = null;
    for (const [uuid, user] of userSystem.objects) {
      if (user.email?.toLowerCase() === inviteData.inviteeEmail.toLowerCase()) {
        hasAccount = true;
        existingUserUuid = uuid;
        break;
      }
    }

    ctx.body = {
      email: inviteData.inviteeEmail,
      inviterName: inviteData.parentName,
      instanceName: inviteData.instanceName,
      hasAccount,
      existingUserUuid,
      expiresAt: inviteData.expiresAt
    };
  }
);

// Accept invite and register (no OTP needed - email verified by clicking link)
router.post(
  "/invite/accept-register",
  validator({
    body: {
      token: String,
      userName: String,
      password: String,
      firstName: String,
      lastName: String
    }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const { token, userName, password, firstName, lastName } = ctx.request.body;

    const inviteKey = `invite:${token}`;
    const stored = singletonMemoryRedis.get<{ value: InviteData }>(inviteKey);

    if (!stored || !stored.value) {
      ctx.throw(404, "Invalid or expired invitation");
    }

    const inviteData = stored.value;

    // Check if expired
    if (Date.now() > inviteData.expiresAt) {
      ctx.throw(410, "Invitation has expired");
    }

    // Check if email already has account
    for (const [, user] of userSystem.objects) {
      if (user.email?.toLowerCase() === inviteData.inviteeEmail.toLowerCase()) {
        ctx.throw(400, "An account with this email already exists. Please login instead.");
      }
    }

    // Check if username already exists
    for (const [, user] of userSystem.objects) {
      if (user.userName.toLowerCase() === userName.toLowerCase()) {
        ctx.throw(400, "Username already taken");
      }
    }

    try {
      // Create the sub-user account with email already verified
      const subUser = await subUserService.createSubUser(
        inviteData.parentUuid,
        inviteData.instanceUuid,
        inviteData.daemonId,
        {
          userName: String(userName),
          passWord: String(password),
          permissions: inviteData.permissions
        }
      );

      // Update user with email and profile info
      await userSystem.edit(subUser.uuid, {
        email: inviteData.inviteeEmail,
        emailVerified: true, // Already verified by clicking invite link
        firstName: String(firstName),
        lastName: String(lastName),
        accountStatus: "active"
      });

      // Race condition protection: check for duplicate email after creation
      let duplicateFound = false;
      for (const [uuid, user] of userSystem.objects) {
        if (uuid !== subUser.uuid &&
            user.email?.toLowerCase() === inviteData.inviteeEmail.toLowerCase()) {
          duplicateFound = true;
          break;
        }
      }

      if (duplicateFound) {
        // Rollback: delete the just-created user
        userSystem.deleteInstance(subUser.uuid);
        ctx.throw(409, "An account with this email was just created. Please login instead.");
      }

      // Delete the invite token
      singletonMemoryRedis.set(inviteKey, null, 0);

      operationLogger.log("sub_user_register_via_invite", {
        operator_ip: ctx.ip,
        user_name: userName,
        email: inviteData.inviteeEmail,
        instance_uuid: inviteData.instanceUuid
      });

      // Send welcome email
      emailService.sendWelcomeEmail(inviteData.inviteeEmail, firstName);

      ctx.body = {
        success: true,
        uuid: subUser.uuid,
        userName: subUser.userName,
        message: "Account created successfully"
      };
    } catch (error: any) {
      ctx.throw(400, error.message);
    }
  }
);

// Accept invite for logged-in user
router.post(
  "/invite/accept",
  permission({ level: ROLE.USER }),
  validator({ body: { token: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { token } = ctx.request.body;

    const inviteKey = `invite:${token}`;
    const stored = singletonMemoryRedis.get<{ value: InviteData }>(inviteKey);

    if (!stored || !stored.value) {
      ctx.throw(404, "Invalid or expired invitation");
    }

    const inviteData = stored.value;

    // Check if expired
    if (Date.now() > inviteData.expiresAt) {
      ctx.throw(410, "Invitation has expired");
    }

    // Get current user
    const currentUser = userSystem.getInstance(userUuid);
    if (!currentUser) {
      ctx.throw(401, "User not found");
    }

    // Verify email matches
    if (currentUser.email?.toLowerCase() !== inviteData.inviteeEmail.toLowerCase()) {
      ctx.throw(403, "This invitation was sent to a different email address");
    }

    try {
      // Add user as sub-user for this instance
      await subUserService.addExistingUserAsSubUser(
        inviteData.parentUuid,
        inviteData.instanceUuid,
        inviteData.daemonId,
        userUuid,
        inviteData.permissions
      );

      // Delete the invite token
      singletonMemoryRedis.set(inviteKey, null, 0);

      operationLogger.log("sub_user_accept_invite", {
        operator_ip: ctx.ip,
        user_uuid: userUuid,
        user_name: currentUser.userName,
        instance_uuid: inviteData.instanceUuid
      });

      ctx.body = {
        success: true,
        message: "Invitation accepted successfully"
      };
    } catch (error: any) {
      ctx.throw(400, error.message);
    }
  }
);

// Get pending invitations for an instance
router.get(
  "/invite/list",
  permission({ level: ROLE.USER }),
  validator({ query: { daemonId: String, instanceUuid: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { daemonId, instanceUuid } = ctx.query;

    if (!canManageSubUsersByUuid(userUuid, String(daemonId), String(instanceUuid))) {
      ctx.throw(403, "You do not have permission to view invitations for this instance");
    }

    // Get invite token list for this instance
    const listKey = `invite_list:${daemonId}:${instanceUuid}`;
    const tokenListData = singletonMemoryRedis.get<{ value: string[] }>(listKey);
    const tokenList = tokenListData?.value || [];

    // Fetch each invite and filter valid ones
    const pendingInvites: Array<{
      token: string;
      email: string;
      expiresAt: number;
    }> = [];
    const validTokens: string[] = [];

    for (const token of tokenList) {
      const inviteKey = `invite:${token}`;
      const stored = singletonMemoryRedis.get<{ value: InviteData }>(inviteKey);

      if (stored?.value && Date.now() < stored.value.expiresAt) {
        // Only show invites for current user (or all if admin)
        if (isTopPermissionByUuid(userUuid) || stored.value.parentUuid === userUuid) {
          pendingInvites.push({
            token: stored.value.token,
            email: stored.value.inviteeEmail,
            expiresAt: stored.value.expiresAt
          });
        }
        validTokens.push(token);
      }
    }

    // Clean up expired tokens from list
    if (validTokens.length !== tokenList.length) {
      singletonMemoryRedis.set(listKey, validTokens, 86400);
    }

    ctx.body = pendingInvites;
  }
);

// Cancel a pending invitation
router.delete(
  "/invite/:token",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userUuid = getUserUuid(ctx);
    const { token } = ctx.params;

    const inviteKey = `invite:${token}`;
    const stored = singletonMemoryRedis.get<{ value: InviteData }>(inviteKey);

    if (!stored || !stored.value) {
      ctx.throw(404, "Invitation not found");
    }

    const inviteData = stored.value;

    // Check if user is admin or the parent who sent the invite
    if (!isTopPermissionByUuid(userUuid) && inviteData.parentUuid !== userUuid) {
      ctx.throw(403, "You do not have permission to cancel this invitation");
    }

    // Delete the invite
    singletonMemoryRedis.set(inviteKey, null, 0);

    ctx.body = { success: true };
  }
);

export default router;
