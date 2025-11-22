import userSystem from "./user_service";
import subUserService from "./sub_user_service";
import { User } from "../entity/user";
import { UserPermissions } from "../entity/entity_interface";

export function isHaveInstance(user: User, daemonId: string, instanceUuid: string) {
  if (isTopPermission(user)) return true;
  if (user && user.instances) {
    for (const v of user.instances) {
      if (daemonId === v.daemonId && instanceUuid === v.instanceUuid) return true;
    }
  }
  return false;
}

export function isTopPermission(user: User) {
  if (!user) return false;
  return user.permission >= 10;
}

export function isTopPermissionByUuid(uuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isTopPermission(user);
}

export function isHaveInstanceByUuid(uuid: string, daemonId: string, instanceUuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isHaveInstance(user, daemonId, instanceUuid);
}

export function getUserByUserName(userName: string) {
  return userSystem.getUserByUserName(userName);
}

/**
 * Check if user can manage sub-users for a specific instance
 * Requirements: Admin OR User must be the owner of the instance (not a sub-user for it)
 */
export function canManageSubUsers(user: User, daemonId: string, instanceUuid: string): boolean {
  // Admins can manage all sub-users
  if (isTopPermission(user)) return true;

  // Must be the owner of this instance (not a sub-user)
  return subUserService.isInstanceOwner(user.uuid, instanceUuid, daemonId);
}

export function canManageSubUsersByUuid(uuid: string, daemonId: string, instanceUuid: string): boolean {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return canManageSubUsers(user, daemonId, instanceUuid);
}

/**
 * Get the permissions for a user on a specific instance.
 * This is the unified permission lookup that handles both:
 * - Sub-users (permissions from parent's subUsers array)
 * - Direct instance owners (permissions from their own instance entry)
 *
 * Returns undefined if user has no permissions for this instance.
 */
export function getUserInstancePermissions(
  userUuid: string,
  instanceUuid: string,
  daemonId: string
): UserPermissions | undefined {
  // First check if user is a sub-user for this instance
  const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
  if (subUserEntry) {
    return subUserEntry.permissions;
  }

  // Otherwise get from user's own instance assignment
  const user = userSystem.getInstance(userUuid);
  if (!user) return undefined;

  const instance = user.instances.find(
    (i) => i.instanceUuid === instanceUuid && i.daemonId === daemonId
  );
  return instance?.permissions;
}

/**
 * Get default full permissions (all enabled, no restrictions)
 * Used when admin assigns instance without specifying permissions
 */
export function getDefaultFullPermissions(): UserPermissions {
  return {
    canUploadFiles: true,
    canDownloadFiles: true,
    canDeleteFiles: true,
    canModifyFiles: true,
    canAccessConsole: true,
    canStartInstances: true,
    canRestartInstances: true,
    canStopInstances: true,
    canTerminateInstances: true,
    canViewLogs: true,
    canAccessConfigFiles: true,
    canAccessFileManager: true,
    canAccessMinecraftQuery: true,
    canAccessTerminalSettings: true,
    canAccessScheduledTasks: true,
    canAccessEventTasks: true,
    canAccessInstanceSettings: true,
    canAccessServerMarket: true,
    disableRightClick: false,
    disableKeyboardShortcuts: false,
    disableTextSelection: false,
    disableCopy: false,
    disablePaste: false
  };
}
