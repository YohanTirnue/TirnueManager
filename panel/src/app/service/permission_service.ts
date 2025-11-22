import userSystem from "./user_service";
import subUserService from "./sub_user_service";
import { User } from "../entity/user";

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
