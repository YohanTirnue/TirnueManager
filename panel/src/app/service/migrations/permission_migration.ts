import userSystem from "../user_service";
import Storage from "../../common/storage/sys_storage";
import { logger } from "../log";
import type { UserPermissions } from "../../entity/entity_interface";

/**
 * Migration to convert old permission field names to new format
 *
 * Old format: canStart, canStop, canTerminal, canFileManager, canFileEdit, canSchedule
 * New format: canStartInstances, canStopInstances, canAccessConsole, canAccessFileManager, etc.
 */

interface OldPermissions {
  canStart?: boolean;
  canStop?: boolean;
  canRestart?: boolean;
  canKill?: boolean;
  canTerminal?: boolean;
  canFileManager?: boolean;
  canFileEdit?: boolean;
  canSchedule?: boolean;
}

function mapOldToNewPermissions(oldPerms: OldPermissions & Partial<UserPermissions>): UserPermissions {
  // Check if already in new format (has any of the new field names)
  if (
    oldPerms.canStartInstances !== undefined ||
    oldPerms.canStopInstances !== undefined ||
    oldPerms.canAccessConsole !== undefined
  ) {
    // Already in new format, just ensure all fields exist with defaults
    return {
      canUploadFiles: oldPerms.canUploadFiles ?? oldPerms.canFileManager ?? true,
      canDownloadFiles: oldPerms.canDownloadFiles ?? oldPerms.canFileManager ?? true,
      canDeleteFiles: oldPerms.canDeleteFiles ?? false,
      canModifyFiles: oldPerms.canModifyFiles ?? oldPerms.canFileEdit ?? true,
      canAccessConsole: oldPerms.canAccessConsole ?? oldPerms.canTerminal ?? true,
      canStartInstances: oldPerms.canStartInstances ?? oldPerms.canStart ?? true,
      canRestartInstances: oldPerms.canRestartInstances ?? oldPerms.canRestart ?? true,
      canStopInstances: oldPerms.canStopInstances ?? oldPerms.canStop ?? true,
      canTerminateInstances: oldPerms.canTerminateInstances ?? oldPerms.canKill ?? false,
      canViewLogs: oldPerms.canViewLogs ?? true,
      canAccessConfigFiles: oldPerms.canAccessConfigFiles ?? false,
      canAccessFileManager: oldPerms.canAccessFileManager ?? oldPerms.canFileManager ?? true,
      canAccessMinecraftQuery: oldPerms.canAccessMinecraftQuery ?? true,
      canAccessTerminalSettings: oldPerms.canAccessTerminalSettings ?? false,
      canAccessScheduledTasks: oldPerms.canAccessScheduledTasks ?? oldPerms.canSchedule ?? false,
      canAccessEventTasks: oldPerms.canAccessEventTasks ?? false,
      canAccessInstanceSettings: oldPerms.canAccessInstanceSettings ?? false,
      canAccessServerMarket: oldPerms.canAccessServerMarket ?? false,
      disableRightClick: oldPerms.disableRightClick ?? false,
      disableKeyboardShortcuts: oldPerms.disableKeyboardShortcuts ?? false,
      disableTextSelection: oldPerms.disableTextSelection ?? false,
      disableCopy: oldPerms.disableCopy ?? false,
      disablePaste: oldPerms.disablePaste ?? false
    };
  }

  // Convert old format to new format
  return {
    canUploadFiles: oldPerms.canFileManager ?? true,
    canDownloadFiles: oldPerms.canFileManager ?? true,
    canDeleteFiles: false,
    canModifyFiles: oldPerms.canFileEdit ?? true,
    canAccessConsole: oldPerms.canTerminal ?? true,
    canStartInstances: oldPerms.canStart ?? true,
    canRestartInstances: oldPerms.canRestart ?? true,
    canStopInstances: oldPerms.canStop ?? true,
    canTerminateInstances: oldPerms.canKill ?? false,
    canViewLogs: true,
    canAccessConfigFiles: false,
    canAccessFileManager: oldPerms.canFileManager ?? true,
    canAccessMinecraftQuery: true,
    canAccessTerminalSettings: false,
    canAccessScheduledTasks: oldPerms.canSchedule ?? false,
    canAccessEventTasks: false,
    canAccessInstanceSettings: false,
    canAccessServerMarket: false,
    disableRightClick: false,
    disableKeyboardShortcuts: false,
    disableTextSelection: false,
    disableCopy: false,
    disablePaste: false
  };
}

export async function migratePermissions(): Promise<void> {
  logger.info("[Migration] Starting permission format migration...");

  let migratedUsers = 0;
  let migratedSubUsers = 0;
  let migratedInstances = 0;

  for (const [uuid, user] of userSystem.objects) {
    let userModified = false;

    // Migrate sub-user permissions
    if (user.subUsers && user.subUsers.length > 0) {
      for (const subUser of user.subUsers) {
        if (subUser.permissions) {
          const oldPerms = subUser.permissions as any;
          // Check if needs migration (has old field names)
          if (
            oldPerms.canStart !== undefined ||
            oldPerms.canTerminal !== undefined ||
            oldPerms.canFileManager !== undefined
          ) {
            subUser.permissions = mapOldToNewPermissions(oldPerms);
            userModified = true;
            migratedSubUsers++;
            logger.info(`[Migration] Migrated sub-user ${subUser.uuid} permissions for parent ${user.userName}`);
          }
        }
      }
    }

    // Migrate instance permissions (if any)
    if (user.instances && user.instances.length > 0) {
      for (const instance of user.instances) {
        if (instance.permissions) {
          const oldPerms = instance.permissions as any;
          // Check if needs migration
          if (
            oldPerms.canStart !== undefined ||
            oldPerms.canTerminal !== undefined ||
            oldPerms.canFileManager !== undefined
          ) {
            instance.permissions = mapOldToNewPermissions(oldPerms);
            userModified = true;
            migratedInstances++;
            logger.info(`[Migration] Migrated instance ${instance.instanceUuid} permissions for ${user.userName}`);
          }
        }
      }
    }

    // Save if modified
    if (userModified) {
      await Storage.getStorage().store("User", uuid, user);
      migratedUsers++;
    }
  }

  if (migratedUsers > 0) {
    logger.info(`[Migration] Permission migration complete: ${migratedUsers} users, ${migratedSubUsers} sub-users, ${migratedInstances} instances migrated`);
  } else {
    logger.info("[Migration] Permission migration complete: No migrations needed");
  }
}
