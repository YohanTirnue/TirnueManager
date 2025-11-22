import { v4 } from "uuid";
import Storage from "../common/storage/sys_storage";
import { User, IUserApp } from "../entity/user";
import type { UserPermissions } from "../entity/entity_interface";
import userSystem from "./user_service";
import { logger } from "./log";
import { $t } from "../i18n";
import { singletonMemoryRedis } from "./mini_redis";
import emailService from "./email_service";

interface InviteData {
  email: string;
  parentUuid: string;
  instanceUuid: string;
  daemonId: string;
  permissions: UserPermissions;
  createdAt: number;
}

const MAX_SUB_USERS_PER_INSTANCE = 3;

export class SubUserService {
  /**
   * Get all sub-users created by a parent user for a specific instance
   */
  getSubUsers(parentUuid: string, instanceUuid: string, daemonId: string): User[] {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) throw new Error("Parent user not found");

    const subUserUuids = parentUser.subUsers
      .filter((su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId)
      .map((su) => su.uuid);

    return subUserUuids
      .map((uuid) => userSystem.getInstance(uuid))
      .filter((user): user is User => user !== undefined);
  }

  /**
   * Get all sub-users for a specific instance (admin view)
   * Returns parent user + their sub-users
   */
  getInstanceTeam(instanceUuid: string, daemonId: string): Array<{
    parent: User;
    subUsers: User[];
  }> {
    const teams: Array<{ parent: User; subUsers: User[] }> = [];

    for (const [uuid, user] of userSystem.objects) {
      // Skip sub-users and users without this instance
      if (user.isSubUser) continue;
      const hasInstance = user.instances.some(
        (inst) => inst.instanceUuid === instanceUuid && inst.daemonId === daemonId
      );
      if (!hasInstance) continue;

      const subUsers = this.getSubUsers(uuid, instanceUuid, daemonId);
      if (subUsers.length > 0) {
        teams.push({ parent: user, subUsers });
      }
    }

    return teams;
  }

  /**
   * Validate if parent can create more sub-users for this instance
   */
  canCreateSubUser(parentUuid: string, instanceUuid: string, daemonId: string): boolean {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) return false;

    // Sub-users cannot create sub-users
    if (parentUser.isSubUser) return false;

    // Check if parent has access to this instance
    const hasInstance = parentUser.instances.some(
      (inst) => inst.instanceUuid === instanceUuid && inst.daemonId === daemonId
    );
    if (!hasInstance) return false;

    // Count existing sub-users for this instance
    const existingCount = parentUser.subUsers.filter(
      (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
    ).length;

    return existingCount < MAX_SUB_USERS_PER_INSTANCE;
  }

  /**
   * Create a sub-user for a specific instance
   */
  async createSubUser(
    parentUuid: string,
    instanceUuid: string,
    daemonId: string,
    userData: {
      userName: string;
      passWord: string;
      permissions?: UserPermissions;
    }
  ): Promise<User> {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) throw new Error("Parent user not found");

    // Validation
    if (parentUser.isSubUser) {
      throw new Error("Sub-users cannot create their own sub-users");
    }

    if (!this.canCreateSubUser(parentUuid, instanceUuid, daemonId)) {
      throw new Error(
        `Maximum ${MAX_SUB_USERS_PER_INSTANCE} sub-users per instance reached`
      );
    }

    // Check if username already exists
    if (userSystem.existUserName(userData.userName)) {
      throw new Error("Username already exists");
    }

    // Validate password
    if (!userSystem.validatePassword(userData.passWord)) {
      throw new Error(
        "Password must be 9-36 characters and contain uppercase, lowercase, and numbers"
      );
    }

    // Create the sub-user
    const subUser = await userSystem.create({
      userName: userData.userName,
      passWord: userData.passWord,
      permission: 1, // USER role
      permissions: userData.permissions,
      isSubUser: true,
      parentUserId: parentUuid
    });

    // Assign only the specific instance to sub-user
    await userSystem.edit(subUser.uuid, {
      instances: [{ instanceUuid, daemonId }]
    });

    // Update parent's subUsers array with race condition protection
    // Re-check count to prevent concurrent creation bypassing limit
    const currentCount = parentUser.subUsers.filter(
      (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
    ).length;

    if (currentCount >= MAX_SUB_USERS_PER_INSTANCE) {
      // Race condition detected: another request created a sub-user
      // Delete the sub-user we just created and throw error
      await userSystem.deleteInstance(subUser.uuid);
      throw new Error(
        `Maximum ${MAX_SUB_USERS_PER_INSTANCE} sub-users per instance reached`
      );
    }

    parentUser.subUsers.push({
      uuid: subUser.uuid,
      instanceUuid,
      daemonId
    });
    await Storage.getStorage().store("User", parentUuid, parentUser);

    logger.info(
      `Sub-user ${subUser.userName} (${subUser.uuid}) created by ${parentUser.userName} for instance ${instanceUuid}`
    );

    return subUser;
  }

  /**
   * Update sub-user permissions
   */
  async updateSubUserPermissions(
    parentUuid: string,
    subUserUuid: string,
    permissions: UserPermissions
  ): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    const subUser = userSystem.getInstance(subUserUuid);

    if (!parentUser || !subUser) throw new Error("User not found");

    // Verify this sub-user belongs to the parent
    if (subUser.parentUserId !== parentUuid) {
      throw new Error("You do not have permission to modify this sub-user");
    }

    await userSystem.edit(subUserUuid, { permissions });
    logger.info(
      `Sub-user ${subUser.userName} permissions updated by ${parentUser.userName}`
    );
  }

  /**
   * Delete a sub-user
   */
  async deleteSubUser(parentUuid: string, subUserUuid: string): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    const subUser = userSystem.getInstance(subUserUuid);

    if (!parentUser || !subUser) throw new Error("User not found");

    // Verify ownership
    if (subUser.parentUserId !== parentUuid) {
      throw new Error("You do not have permission to delete this sub-user");
    }

    // Remove from parent's subUsers array
    parentUser.subUsers = parentUser.subUsers.filter((su) => su.uuid !== subUserUuid);
    await Storage.getStorage().store("User", parentUuid, parentUser);

    // Delete the sub-user
    await userSystem.deleteInstance(subUserUuid);

    logger.info(
      `Sub-user ${subUser.userName} (${subUserUuid}) deleted by ${parentUser.userName}`
    );
  }

  /**
   * Delete all sub-users for a specific instance (called when instance is deleted)
   */
  async deleteInstanceSubUsers(instanceUuid: string, daemonId: string): Promise<void> {
    for (const [uuid, user] of userSystem.objects) {
      if (!user.isSubUser) {
        // Remove sub-users for this instance
        const subUsersToDelete = user.subUsers.filter(
          (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
        );

        for (const su of subUsersToDelete) {
          await userSystem.deleteInstance(su.uuid);
        }

        // Update parent's subUsers array
        user.subUsers = user.subUsers.filter(
          (su) => !(su.instanceUuid === instanceUuid && su.daemonId === daemonId)
        );
        await Storage.getStorage().store("User", uuid, user);
      }
    }
  }

  /**
   * Handle cleanup when a parent user loses access to an instance
   */
  async handleParentInstanceRemoval(
    parentUuid: string,
    instanceUuid: string,
    daemonId: string
  ): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) return;

    // Delete all sub-users for this instance
    const subUsersToDelete = parentUser.subUsers.filter(
      (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
    );

    for (const su of subUsersToDelete) {
      await userSystem.deleteInstance(su.uuid);
      logger.info(
        `Sub-user ${su.uuid} auto-deleted due to parent losing instance access`
      );
    }

    // Update parent's subUsers array
    parentUser.subUsers = parentUser.subUsers.filter(
      (su) => !(su.instanceUuid === instanceUuid && su.daemonId === daemonId)
    );
    await Storage.getStorage().store("User", parentUuid, parentUser);
  }

  /**
   * Get parent user info for a sub-user
   */
  getParentUser(subUserUuid: string): User | null {
    const subUser = userSystem.getInstance(subUserUuid);
    if (!subUser || !subUser.isSubUser || !subUser.parentUserId) return null;
    return userSystem.getInstance(subUser.parentUserId) || null;
  }

  /**
   * Create an invitation for a sub-user
   */
  async createInvite(
    parentUuid: string,
    instanceUuid: string,
    daemonId: string,
    email: string,
    permissions: UserPermissions,
    panelUrl: string
  ): Promise<{ token: string; inviteLink: string }> {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) throw new Error("Parent user not found");

    // Validation
    if (parentUser.isSubUser) {
      throw new Error("Sub-users cannot invite their own sub-users");
    }

    if (!this.canCreateSubUser(parentUuid, instanceUuid, daemonId)) {
      throw new Error(
        `Maximum ${MAX_SUB_USERS_PER_INSTANCE} sub-users per instance reached`
      );
    }

    // Check if email already has an account
    const existingUser = Array.from(userSystem.objects.values()).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    // Generate invite token
    const token = v4();
    const inviteData: InviteData = {
      email: email.toLowerCase(),
      parentUuid,
      instanceUuid,
      daemonId,
      permissions,
      createdAt: Date.now()
    };

    // Store in Redis with 72 hour TTL
    const INVITE_TTL = 72 * 60 * 60; // 72 hours in seconds
    singletonMemoryRedis.set(`invite:${token}`, inviteData, INVITE_TTL);

    const inviteLink = `${panelUrl}/#/accept-invite?token=${token}`;

    // Send email
    const instanceName = `Instance ${instanceUuid.substring(0, 8)}...`;
    const emailSent = await emailService.sendInviteEmail(
      email,
      inviteLink,
      instanceName,
      parentUser.userName
    );

    if (!emailSent) {
      // Remove token if email failed
      singletonMemoryRedis.set(`invite:${token}`, null, 0);
      throw new Error("Failed to send invitation email. Please check email configuration.");
    }

    logger.info(
      `Invitation sent to ${email} by ${parentUser.userName} for instance ${instanceUuid}`
    );

    return { token, inviteLink };
  }

  /**
   * Verify an invite token
   */
  verifyInvite(token: string): {
    valid: boolean;
    invite?: InviteData;
    hasAccount?: boolean;
    parentName?: string;
  } {
    const data = singletonMemoryRedis.get<{ value: InviteData }>(`invite:${token}`);
    if (!data || !data.value) {
      return { valid: false };
    }

    const invite = data.value;

    // Check if email already has account
    const existingUser = Array.from(userSystem.objects.values()).find(
      (u) => u.email?.toLowerCase() === invite.email.toLowerCase()
    );

    // Get parent name
    const parent = userSystem.getInstance(invite.parentUuid);

    return {
      valid: true,
      invite,
      hasAccount: !!existingUser,
      parentName: parent?.userName
    };
  }

  /**
   * Accept invite for logged-in user
   */
  async acceptInvite(token: string, userUuid: string): Promise<User> {
    const verification = this.verifyInvite(token);
    if (!verification.valid || !verification.invite) {
      throw new Error("Invalid or expired invitation");
    }

    const invite = verification.invite;
    const user = userSystem.getInstance(userUuid);

    if (!user) {
      throw new Error("User not found");
    }

    // Check email matches
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Re-check if parent can still create sub-users
    if (!this.canCreateSubUser(invite.parentUuid, invite.instanceUuid, invite.daemonId)) {
      throw new Error("Parent user has reached maximum sub-users for this instance");
    }

    const parentUser = userSystem.getInstance(invite.parentUuid);
    if (!parentUser) {
      throw new Error("Parent user no longer exists");
    }

    // Convert user to sub-user
    await userSystem.edit(userUuid, {
      isSubUser: true,
      parentUserId: invite.parentUuid,
      permissions: invite.permissions,
      instances: [{ instanceUuid: invite.instanceUuid, daemonId: invite.daemonId }]
    });

    // Add to parent's subUsers array
    parentUser.subUsers.push({
      uuid: userUuid,
      instanceUuid: invite.instanceUuid,
      daemonId: invite.daemonId
    });
    await Storage.getStorage().store("User", invite.parentUuid, parentUser);

    // Invalidate token
    singletonMemoryRedis.set(`invite:${token}`, null, 0);

    logger.info(
      `User ${user.userName} accepted invitation from ${parentUser.userName} for instance ${invite.instanceUuid}`
    );

    return user;
  }

  /**
   * Accept invite with new registration (no OTP needed - email link proves ownership)
   */
  async acceptInviteWithRegistration(
    token: string,
    userData: {
      userName: string;
      passWord: string;
    }
  ): Promise<User> {
    const verification = this.verifyInvite(token);
    if (!verification.valid || !verification.invite) {
      throw new Error("Invalid or expired invitation");
    }

    const invite = verification.invite;

    // Check if username exists
    if (userSystem.existUserName(userData.userName)) {
      throw new Error("Username already exists");
    }

    // Validate password
    if (!userSystem.validatePassword(userData.passWord)) {
      throw new Error(
        "Password must be 9-36 characters and contain uppercase, lowercase, and numbers"
      );
    }

    // Re-check if parent can still create sub-users
    if (!this.canCreateSubUser(invite.parentUuid, invite.instanceUuid, invite.daemonId)) {
      throw new Error("Parent user has reached maximum sub-users for this instance");
    }

    const parentUser = userSystem.getInstance(invite.parentUuid);
    if (!parentUser) {
      throw new Error("Parent user no longer exists");
    }

    // Create the sub-user account
    const subUser = await userSystem.create({
      userName: userData.userName,
      passWord: userData.passWord,
      email: invite.email,
      permission: 1, // USER role
      permissions: invite.permissions,
      isSubUser: true,
      parentUserId: invite.parentUuid
    });

    // Assign only the specific instance
    await userSystem.edit(subUser.uuid, {
      instances: [{ instanceUuid: invite.instanceUuid, daemonId: invite.daemonId }]
    });

    // Add to parent's subUsers array
    parentUser.subUsers.push({
      uuid: subUser.uuid,
      instanceUuid: invite.instanceUuid,
      daemonId: invite.daemonId
    });
    await Storage.getStorage().store("User", invite.parentUuid, parentUser);

    // Invalidate token
    singletonMemoryRedis.set(`invite:${token}`, null, 0);

    logger.info(
      `Sub-user ${subUser.userName} registered via invitation from ${parentUser.userName} for instance ${invite.instanceUuid}`
    );

    return subUser;
  }
}

export default new SubUserService();
