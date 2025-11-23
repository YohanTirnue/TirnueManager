import userSystem from "./user_service";
import subUserService from "./sub_user_service";
import { User } from "../entity/user";
import { UserPermissions } from "../entity/entity_interface";
import { permissionCache } from "./permission_cache_service";

export function isHaveInstance(user: User, daemonId: string, instanceUuid: string) {
  // Admins and moderators can access all instances
  if (isModeratorOrHigher(user)) return true;
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

/**
 * Check if user is a moderator (not senior moderator or admin)
 */
export function isModerator(user: User) {
  if (!user) return false;
  return user.permission === 5;
}

export function isModeratorByUuid(uuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isModerator(user);
}

/**
 * Check if user is a senior moderator
 */
export function isSeniorModerator(user: User) {
  if (!user) return false;
  return user.permission === 7;
}

export function isSeniorModeratorByUuid(uuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isSeniorModerator(user);
}

/**
 * Check if user is senior moderator or admin (can manage moderators)
 */
export function canManageModerators(user: User) {
  if (!user) return false;
  return user.permission >= 7;
}

export function canManageModeratorsbyUuid(uuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return canManageModerators(user);
}

/**
 * Check if user is moderator or higher (moderator, senior moderator, or admin)
 */
export function isModeratorOrHigher(user: User) {
  if (!user) return false;
  return user.permission >= 5;
}

export function isModeratorOrHigherByUuid(uuid: string) {
  const user = userSystem.getInstance(uuid);
  if (!user) return false;
  return isModeratorOrHigher(user);
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
 * Requirements: Admin/Moderator OR User must be the owner of the instance (not a sub-user for it)
 */
export function canManageSubUsers(user: User, daemonId: string, instanceUuid: string): boolean {
  // Admins and moderators can manage all sub-users
  if (isModeratorOrHigher(user)) return true;

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
 * Uses caching for performance - permissions are cached for 5 minutes.
 * Returns undefined if user has no permissions for this instance.
 */
export function getUserInstancePermissions(
  userUuid: string,
  instanceUuid: string,
  daemonId: string
): UserPermissions | undefined {
  // Check cache first
  const cached = permissionCache.get(userUuid, instanceUuid);
  if (cached) {
    return cached;
  }

  // First check if user is a sub-user for this instance
  const subUserEntry = subUserService.getSubUserEntry(userUuid, instanceUuid, daemonId);
  if (subUserEntry) {
    permissionCache.set(userUuid, instanceUuid, subUserEntry.permissions);
    return subUserEntry.permissions;
  }

  // Otherwise get from user's own instance assignment
  const user = userSystem.getInstance(userUuid);
  if (!user) return undefined;

  const instance = user.instances.find(
    (i) => i.instanceUuid === instanceUuid && i.daemonId === daemonId
  );

  if (instance?.permissions) {
    permissionCache.set(userUuid, instanceUuid, instance.permissions);
  }

  return instance?.permissions;
}

/**
 * Invalidate cached permissions for a user
 * Call this after updating permissions
 */
export function invalidatePermissionCache(userUuid: string, instanceUuid?: string): void {
  permissionCache.invalidate(userUuid, instanceUuid);
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
