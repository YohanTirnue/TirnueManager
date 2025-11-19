export interface UserPermissions {
  canUploadFiles: boolean;
  canDownloadFiles: boolean;
  canDeleteFiles: boolean;
  canModifyFiles: boolean;
  canAccessConsole: boolean;
  canRestartInstances: boolean;
  canStopInstances: boolean;
  canViewLogs: boolean;
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
  permissions?: UserPermissions;
}

export interface EditUserInfo extends BaseUserInfo {
  passWord?: string;
}

export interface LoginUserInfo extends BaseUserInfo {
  token: string;
}
