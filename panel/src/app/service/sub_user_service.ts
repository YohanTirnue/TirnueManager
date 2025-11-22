import { v4 } from "uuid";
import Storage from "../common/storage/sys_storage";
import { User, IUserApp } from "../entity/user";
import type { UserPermissions, ISubUserEntry } from "../entity/entity_interface";
import userSystem from "./user_service";
import { logger } from "./log";
import { $t } from "../i18n";

const MAX_SUB_USERS_PER_INSTANCE = 3;

export class SubUserService {
  /**
   * Get all sub-users created by a parent user for a specific instance
   */
  getSubUsers(parentUuid: string, instanceUuid: string, daemonId: string): Array<{ user: User; permissions: UserPermissions }> {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) throw new Error("Parent user not found");

    const subUserEntries = parentUser.subUsers.filter(
      (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
    );

    return subUserEntries
      .map((entry) => {
        const user = userSystem.getInstance(entry.uuid);
        if (!user) return null;
        return { user, permissions: entry.permissions };
      })
      .filter((item): item is { user: User; permissions: UserPermissions } => item !== null);
  }

  /**
   * Check if a user is a sub-user for a specific instance
   * Returns the sub-user entry with permissions if found
   */
  getSubUserEntry(userUuid: string, instanceUuid: string, daemonId: string): ISubUserEntry | null {
    // Search all users' subUsers arrays for this user+instance combination
    for (const [parentUuid, parentUser] of userSystem.objects) {
      const entry = parentUser.subUsers.find(
        (su) => su.uuid === userUuid && su.instanceUuid === instanceUuid && su.daemonId === daemonId
      );
      if (entry) {
        return entry;
      }
    }
    return null;
  }

  /**
   * Get the parent user who granted sub-user access to a user for a specific instance
   */
  getParentForInstance(userUuid: string, instanceUuid: string, daemonId: string): User | null {
    for (const [parentUuid, parentUser] of userSystem.objects) {
      const entry = parentUser.subUsers.find(
        (su) => su.uuid === userUuid && su.instanceUuid === instanceUuid && su.daemonId === daemonId
      );
      if (entry) {
        return parentUser;
      }
    }
    return null;
  }

  /**
   * Check if user is the owner of an instance (has it in their instances array, not as sub-user)
   */
  isInstanceOwner(userUuid: string, instanceUuid: string, daemonId: string): boolean {
    const user = userSystem.getInstance(userUuid);
    if (!user) return false;

    // Check if user has this instance AND is not a sub-user for it
    const hasInstance = user.instances.some(
      (inst) => inst.instanceUuid === instanceUuid && inst.daemonId === daemonId
    );
    if (!hasInstance) return false;

    // Check they're not a sub-user for this instance
    const isSubUser = this.getSubUserEntry(userUuid, instanceUuid, daemonId) !== null;
    return !isSubUser;
  }

  /**
   * Get all sub-users for a specific instance (admin view)
   * Returns parent user + their sub-users with per-instance permissions
   */
  getInstanceTeam(instanceUuid: string, daemonId: string): Array<{
    parent: User;
    subUsers: Array<{ user: User; permissions: UserPermissions }>;
  }> {
    const teams: Array<{
      parent: User;
      subUsers: Array<{ user: User; permissions: UserPermissions }>;
    }> = [];

    for (const [uuid, user] of userSystem.objects) {
      // Check if user is an owner of this instance (not a sub-user)
      if (!this.isInstanceOwner(uuid, instanceUuid, daemonId)) continue;

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

    // Check if this user is the owner of the instance (not a sub-user)
    if (!this.isInstanceOwner(parentUuid, instanceUuid, daemonId)) return false;

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
      permissions: UserPermissions;
    }
  ): Promise<User> {
    const parentUser = userSystem.getInstance(parentUuid);
    if (!parentUser) throw new Error("Parent user not found");

    // Validation - must be owner of this instance
    if (!this.isInstanceOwner(parentUuid, instanceUuid, daemonId)) {
      throw new Error("You must be the owner of this instance to create sub-users");
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

    // Create the user (just a regular user - sub-user status is per-instance)
    const subUser = await userSystem.create({
      userName: userData.userName,
      passWord: userData.passWord,
      permission: 1 // USER role
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

    // Add to parent's subUsers with per-instance permissions
    parentUser.subUsers.push({
      uuid: subUser.uuid,
      instanceUuid,
      daemonId,
      permissions: userData.permissions
    });
    await Storage.getStorage().store("User", parentUuid, parentUser);

    logger.info(
      `Sub-user ${subUser.userName} (${subUser.uuid}) created by ${parentUser.userName} for instance ${instanceUuid}`
    );

    return subUser;
  }

  /**
   * Add an existing user as a sub-user for a specific instance
   * This allows a user to be owner of their own instances while being sub-user of others
   */
  async addExistingUserAsSubUser(
    parentUuid: string,
    instanceUuid: string,
    daemonId: string,
    subUserUuid: string,
    permissions: UserPermissions
  ): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    const subUser = userSystem.getInstance(subUserUuid);

    if (!parentUser) throw new Error("Parent user not found");
    if (!subUser) throw new Error("Sub-user not found");

    // Validation - must be owner of this instance
    if (!this.isInstanceOwner(parentUuid, instanceUuid, daemonId)) {
      throw new Error("You must be the owner of this instance to add sub-users");
    }

    if (!this.canCreateSubUser(parentUuid, instanceUuid, daemonId)) {
      throw new Error(
        `Maximum ${MAX_SUB_USERS_PER_INSTANCE} sub-users per instance reached`
      );
    }

    // Check if user is already a sub-user for this instance
    const existingEntry = this.getSubUserEntry(subUserUuid, instanceUuid, daemonId);
    if (existingEntry) {
      throw new Error("User is already a sub-user for this instance");
    }

    // Add instance to sub-user's instances if not already there
    const hasInstance = subUser.instances.some(
      (inst) => inst.instanceUuid === instanceUuid && inst.daemonId === daemonId
    );
    if (!hasInstance) {
      subUser.instances.push({ instanceUuid, daemonId });
      await Storage.getStorage().store("User", subUserUuid, subUser);
    }

    // Add to parent's subUsers with per-instance permissions
    parentUser.subUsers.push({
      uuid: subUserUuid,
      instanceUuid,
      daemonId,
      permissions
    });
    await Storage.getStorage().store("User", parentUuid, parentUser);

    logger.info(
      `User ${subUser.userName} (${subUserUuid}) added as sub-user by ${parentUser.userName} for instance ${instanceUuid}`
    );
  }

  /**
   * Update sub-user permissions for a specific instance
   */
  async updateSubUserPermissions(
    parentUuid: string,
    subUserUuid: string,
    instanceUuid: string,
    daemonId: string,
    permissions: UserPermissions
  ): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    const subUser = userSystem.getInstance(subUserUuid);

    if (!parentUser || !subUser) throw new Error("User not found");

    // Find the sub-user entry in parent's subUsers
    const entryIndex = parentUser.subUsers.findIndex(
      (su) => su.uuid === subUserUuid && su.instanceUuid === instanceUuid && su.daemonId === daemonId
    );

    if (entryIndex === -1) {
      throw new Error("You do not have permission to modify this sub-user for this instance");
    }

    // Update permissions in the subUsers entry
    parentUser.subUsers[entryIndex].permissions = permissions;
    await Storage.getStorage().store("User", parentUuid, parentUser);

    logger.info(
      `Sub-user ${subUser.userName} permissions for instance ${instanceUuid} updated by ${parentUser.userName}`
    );
  }

  /**
   * Remove a sub-user's access to a specific instance
   */
  async removeSubUserFromInstance(
    parentUuid: string,
    subUserUuid: string,
    instanceUuid: string,
    daemonId: string
  ): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    const subUser = userSystem.getInstance(subUserUuid);

    if (!parentUser || !subUser) throw new Error("User not found");

    // Find the sub-user entry
    const entryIndex = parentUser.subUsers.findIndex(
      (su) => su.uuid === subUserUuid && su.instanceUuid === instanceUuid && su.daemonId === daemonId
    );

    if (entryIndex === -1) {
      throw new Error("You do not have permission to remove this sub-user from this instance");
    }

    // Remove from parent's subUsers array
    parentUser.subUsers.splice(entryIndex, 1);
    await Storage.getStorage().store("User", parentUuid, parentUser);

    // Remove instance from sub-user's instances
    subUser.instances = subUser.instances.filter(
      (inst) => !(inst.instanceUuid === instanceUuid && inst.daemonId === daemonId)
    );
    await Storage.getStorage().store("User", subUserUuid, subUser);

    // If user has no instances left and no other sub-user entries, they might be orphaned
    // but we don't delete them - they could still log in and get new invitations

    logger.info(
      `Sub-user ${subUser.userName} (${subUserUuid}) removed from instance ${instanceUuid} by ${parentUser.userName}`
    );
  }

  /**
   * Delete a sub-user completely (removes from all instances)
   * Only use this if the user was created solely for this sub-user purpose
   */
  async deleteSubUser(parentUuid: string, subUserUuid: string): Promise<void> {
    const parentUser = userSystem.getInstance(parentUuid);
    const subUser = userSystem.getInstance(subUserUuid);

    if (!parentUser || !subUser) throw new Error("User not found");

    // Get all entries for this sub-user under this parent
    const entries = parentUser.subUsers.filter((su) => su.uuid === subUserUuid);

    if (entries.length === 0) {
      throw new Error("You do not have permission to delete this sub-user");
    }

    // Remove all entries for this sub-user from parent's subUsers array
    parentUser.subUsers = parentUser.subUsers.filter((su) => su.uuid !== subUserUuid);
    await Storage.getStorage().store("User", parentUuid, parentUser);

    // Check if user is sub-user under any other parent
    let isSubUserElsewhere = false;
    for (const [otherUuid, otherUser] of userSystem.objects) {
      if (otherUuid !== parentUuid && otherUser.subUsers.some((su) => su.uuid === subUserUuid)) {
        isSubUserElsewhere = true;
        break;
      }
    }

    // If user is not a sub-user elsewhere and has no owned instances, delete them
    if (!isSubUserElsewhere) {
      // Check if they own any instances (are not sub-users for them)
      const ownsInstances = subUser.instances.some((inst) => {
        return this.isInstanceOwner(subUserUuid, inst.instanceUuid, inst.daemonId);
      });

      if (!ownsInstances) {
        await userSystem.deleteInstance(subUserUuid);
        logger.info(
          `Sub-user ${subUser.userName} (${subUserUuid}) deleted by ${parentUser.userName}`
        );
        return;
      }
    }

    // Just remove the instances that were granted by this parent
    for (const entry of entries) {
      subUser.instances = subUser.instances.filter(
        (inst) => !(inst.instanceUuid === entry.instanceUuid && inst.daemonId === entry.daemonId)
      );
    }
    await Storage.getStorage().store("User", subUserUuid, subUser);

    logger.info(
      `Sub-user ${subUser.userName} (${subUserUuid}) removed from ${entries.length} instances by ${parentUser.userName}`
    );
  }

  /**
   * Delete all sub-user entries for a specific instance (called when instance is deleted)
   */
  async deleteInstanceSubUsers(instanceUuid: string, daemonId: string): Promise<void> {
    for (const [uuid, user] of userSystem.objects) {
      // Find sub-user entries for this instance
      const subUserEntries = user.subUsers.filter(
        (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
      );

      if (subUserEntries.length === 0) continue;

      // Remove instance access from each sub-user
      for (const entry of subUserEntries) {
        const subUser = userSystem.getInstance(entry.uuid);
        if (subUser) {
          // Remove this instance from sub-user's instances
          subUser.instances = subUser.instances.filter(
            (inst) => !(inst.instanceUuid === instanceUuid && inst.daemonId === daemonId)
          );
          await Storage.getStorage().store("User", entry.uuid, subUser);
        }
      }

      // Update parent's subUsers array
      user.subUsers = user.subUsers.filter(
        (su) => !(su.instanceUuid === instanceUuid && su.daemonId === daemonId)
      );
      await Storage.getStorage().store("User", uuid, user);
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

    // Find sub-user entries for this instance
    const subUserEntries = parentUser.subUsers.filter(
      (su) => su.instanceUuid === instanceUuid && su.daemonId === daemonId
    );

    // Remove instance access from each sub-user
    for (const entry of subUserEntries) {
      const subUser = userSystem.getInstance(entry.uuid);
      if (subUser) {
        subUser.instances = subUser.instances.filter(
          (inst) => !(inst.instanceUuid === instanceUuid && inst.daemonId === daemonId)
        );
        await Storage.getStorage().store("User", entry.uuid, subUser);
        logger.info(
          `Sub-user ${entry.uuid} lost access to instance ${instanceUuid} due to parent losing access`
        );
      }
    }

    // Update parent's subUsers array
    parentUser.subUsers = parentUser.subUsers.filter(
      (su) => !(su.instanceUuid === instanceUuid && su.daemonId === daemonId)
    );
    await Storage.getStorage().store("User", parentUuid, parentUser);
  }

  /**
   * Get all parent users who have granted sub-user access to a user
   * Returns array of {parent, instanceUuid, daemonId, permissions}
   */
  getAllParentsForUser(userUuid: string): Array<{
    parent: User;
    instanceUuid: string;
    daemonId: string;
    permissions: UserPermissions;
  }> {
    const results: Array<{
      parent: User;
      instanceUuid: string;
      daemonId: string;
      permissions: UserPermissions;
    }> = [];

    for (const [parentUuid, parentUser] of userSystem.objects) {
      const entries = parentUser.subUsers.filter((su) => su.uuid === userUuid);
      for (const entry of entries) {
        results.push({
          parent: parentUser,
          instanceUuid: entry.instanceUuid,
          daemonId: entry.daemonId,
          permissions: entry.permissions
        });
      }
    }

    return results;
  }
}

export default new SubUserService();
