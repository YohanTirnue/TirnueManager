import { useAppStateStore } from "@/stores/useAppStateStore";
import type { UserPermissions } from "@/types/user";
import { computed } from "vue";

/**
 * Composable for checking user permissions
 * Returns permission check functions and current user's permissions
 */
export function useUserPermissions() {
  const { state, isAdmin } = useAppStateStore();

  // Get current user's permissions with defaults
  const userPermissions = computed<UserPermissions>(() => {
    // Admins have all permissions by default
    if (isAdmin.value) {
      return {
        canUploadFiles: true,
        canDownloadFiles: true,
        canDeleteFiles: true,
        canModifyFiles: true,
        canAccessConsole: true,
        canStartInstances: true,
        canRestartInstances: true,
        canStopInstances: true,
        canViewLogs: true,
        disableRightClick: false,
        disableKeyboardShortcuts: false,
        disableTextSelection: false,
        disableCopy: false,
        disablePaste: false
      };
    }

    // Return user's permissions or DENY ALL if not set (fail-closed security)
    return (
      state.userInfo?.permissions ?? {
        canUploadFiles: false,
        canDownloadFiles: false,
        canDeleteFiles: false,
        canModifyFiles: false,
        canAccessConsole: false,
        canStartInstances: false,
        canRestartInstances: false,
        canStopInstances: false,
        canViewLogs: false,
        disableRightClick: false,
        disableKeyboardShortcuts: false,
        disableTextSelection: false,
        disableCopy: false,
        disablePaste: false
      }
    );
  });

  // File operation permissions
  const canUploadFiles = computed(() => userPermissions.value.canUploadFiles);
  const canDownloadFiles = computed(() => userPermissions.value.canDownloadFiles);
  const canDeleteFiles = computed(() => userPermissions.value.canDeleteFiles);
  const canModifyFiles = computed(() => userPermissions.value.canModifyFiles);

  // Instance control permissions
  const canAccessConsole = computed(() => userPermissions.value.canAccessConsole);
  const canStartInstances = computed(() => userPermissions.value.canStartInstances);
  const canRestartInstances = computed(() => userPermissions.value.canRestartInstances);
  const canStopInstances = computed(() => userPermissions.value.canStopInstances);
  const canViewLogs = computed(() => userPermissions.value.canViewLogs);

  // Security restrictions
  const disableRightClick = computed(() => userPermissions.value.disableRightClick);
  const disableKeyboardShortcuts = computed(
    () => userPermissions.value.disableKeyboardShortcuts
  );
  const disableTextSelection = computed(() => userPermissions.value.disableTextSelection);
  const disableCopy = computed(() => userPermissions.value.disableCopy);
  const disablePaste = computed(() => userPermissions.value.disablePaste);

  // Check if user has access to a specific instance (by instance assignment)
  const hasInstanceAccess = (instanceId: string): boolean => {
    if (isAdmin.value) return true;
    if (!state.userInfo?.instances) return false;
    return state.userInfo.instances.some((inst) => inst.instanceUuid === instanceId);
  };

  // Combined permission check: Has permission AND has instance access
  const canPerformInstanceAction = (
    instanceId: string,
    action: keyof Pick<
      UserPermissions,
      | "canStartInstances"
      | "canStopInstances"
      | "canRestartInstances"
      | "canAccessConsole"
      | "canViewLogs"
    >
  ): boolean => {
    if (isAdmin.value) return true;
    return hasInstanceAccess(instanceId) && userPermissions.value[action];
  };

  // Combined permission check for file operations
  const canPerformFileAction = (
    instanceId: string,
    action: keyof Pick<
      UserPermissions,
      "canUploadFiles" | "canDownloadFiles" | "canDeleteFiles" | "canModifyFiles"
    >
  ): boolean => {
    if (isAdmin.value) return true;
    return hasInstanceAccess(instanceId) && userPermissions.value[action];
  };

  return {
    // Raw permissions object
    userPermissions,

    // Individual permission checks
    canUploadFiles,
    canDownloadFiles,
    canDeleteFiles,
    canModifyFiles,
    canAccessConsole,
    canStartInstances,
    canRestartInstances,
    canStopInstances,
    canViewLogs,
    disableRightClick,
    disableKeyboardShortcuts,
    disableTextSelection,
    disableCopy,
    disablePaste,

    // Helper functions
    hasInstanceAccess,
    canPerformInstanceAction,
    canPerformFileAction
  };
}
