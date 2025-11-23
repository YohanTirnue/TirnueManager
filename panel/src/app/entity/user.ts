import { IUser, ISubUserEntry } from "./entity_interface";

export enum UserPassWordType {
  md5 = 0,
  bcrypt = 1
}

export interface IUserApp {
  instanceUuid: string;
  daemonId: string;
  instanceInfo?: any;
  permissions?: import("./entity_interface").UserPermissions;
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

  // Per-instance sub-user management
  // A user can own some instances (full control) and be a sub-user of others (limited permissions)
  subUsers: Array<ISubUserEntry> = [];

  // Email registration fields
  email: string = "";
  emailVerified: boolean = false;
  firstName: string = "";
  lastName: string = "";
  location: string = "";
  createdIp: string = "";
  lastLoginIp: string = "";
  accountStatus: string = "active"; // 'active' | 'suspended' | 'pending_verification'

  // User-owned daemons/nodes with instance limits
  ownedDaemons: Array<import("./entity_interface").OwnedDaemon> = [];

  // Device fingerprinting for alt account detection
  fingerprint?: {
    userAgent?: string;
    platform?: string;
    language?: string;
    screen?: {
      width: number;
      height: number;
      colorDepth: number;
      pixelDepth: number;
    };
    timezone?: string;
    timezoneOffset?: number;
    canvasFp?: string;
    webglFp?: {
      vendor?: string;
      renderer?: string;
    };
    audioFp?: string;
    fonts?: string[];
    plugins?: Array<{ name: string; filename: string }>;
    hardwareConcurrency?: number;
    deviceMemory?: number;
    cookieEnabled?: boolean;
    doNotTrack?: string;
    maxTouchPoints?: number;
    trackingCookie?: string; // Persistent tracking cookie ID
  };
  fingerprintHash?: string; // Short hash for easy comparison
  trackingCookie?: string; // Quick access to tracking cookie for alt detection
}

export enum ROLE {
  ADMIN = 10,
  SENIOR_MODERATOR = 7,
  MODERATOR = 5,
  USER = 1,
  GUEST = 0,
  BAN = -1
}
