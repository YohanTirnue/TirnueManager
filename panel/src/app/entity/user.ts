import { IUser, UserPermissions } from "./entity_interface";

export enum UserPassWordType {
  md5 = 0,
  bcrypt = 1
}

export interface IUserApp {
  instanceUuid: string;
  daemonId: string;
  instanceInfo?: any;
}

export class User implements IUser {
  uuid: string = "";
  userName: string = "";
  passWord: string = "";
  passWordType: number = UserPassWordType.bcrypt;
  salt: string = "";
  permission: number = 0;
  registerTime: string = "";
  loginTime: string = "";
  instances: Array<IUserApp> = [];
  apiKey: string = "";
  isInit: boolean = false;
  secret = "";
  open2FA = false;
  permissions?: UserPermissions;

  // Sub-user management fields
  isSubUser: boolean = false;
  parentUserId?: string;
  subUsers: Array<{ uuid: string; instanceUuid: string; daemonId: string }> = [];

  // Email registration fields
  email: string = "";
  emailVerified: boolean = false;
  firstName: string = "";
  lastName: string = "";
  location: string = "";
  createdIp: string = "";
  lastLoginIp: string = "";
  accountStatus: string = "active"; // 'active' | 'suspended' | 'pending_verification'
}

export enum ROLE {
  ADMIN = 10,
  USER = 1,
  GUEST = 0,
  BAN = -1
}
