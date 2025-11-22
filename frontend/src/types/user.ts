export interface UserPermissions {
  // File Operations (scoped to assigned instances)
  canUploadFiles: boolean;
  canDownloadFiles: boolean;
  canDeleteFiles: boolean;
  canModifyFiles: boolean;

  // Instance Control (scoped to assigned instances)
  canAccessConsole: boolean;
  canStartInstances: boolean;
  canRestartInstances: boolean;
  canStopInstances: boolean;
  canTerminateInstances: boolean;
  canViewLogs: boolean;

  // Instance Management Access (scoped to assigned instances)
  canAccessConfigFiles: boolean;
  canAccessFileManager: boolean;
  canAccessMinecraftQuery: boolean;
  canAccessTerminalSettings: boolean;
  canAccessScheduledTasks: boolean;
  canAccessEventTasks: boolean;
  canAccessInstanceSettings: boolean;
  canAccessServerMarket: boolean;

  // Security Restrictions (global to user session)
  disableRightClick: boolean;
  disableKeyboardShortcuts: boolean;
  disableTextSelection: boolean;
  disableCopy: boolean;
  disablePaste: boolean;
}

export interface UserInstance {
  hostIp: string;
  instanceUuid: string;
  nickname: string;
  daemonId: string;
  status: number;
  config?: IGlobalInstanceConfig;
  processType?: string;
  lastDatetime?: number;
  endTime?: number;
  permissions?: UserPermissions;
}

export interface BaseUserInfo {
  uuid: string;
  userName: string;
  loginTime: string;
  registerTime: string;
  instances: UserInstance[];
  permission: number;
  apiKey: string;
  isInit: boolean;
  secret: string;
  open2FA: boolean;
  isSubUser?: boolean;
  parentUserId?: string;
  subUsers?: Array<{ uuid: string; instanceUuid: string; daemonId: string; permissions?: UserPermissions }>;
  // Email registration fields
  email?: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  location?: string;
  createdIp?: string;
  lastLoginIp?: string;
  accountStatus?: string;
}

export interface EditUserInfo extends BaseUserInfo {
  passWord?: string;
}

export interface LoginUserInfo extends BaseUserInfo {
  token: string;
}
