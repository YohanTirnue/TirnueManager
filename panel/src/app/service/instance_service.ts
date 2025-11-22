import userSystem from "../service/user_service";
import RemoteServiceSubsystem from "../service/remote_service";
import RemoteRequest from "../service/remote_command";
import { t } from "i18next";
import { systemConfig } from "../setting";
import { toText } from "mcsmanager-common";
import type { UserPermissions } from "../entity/entity_interface";

export enum INSTANCE_STATUS {
  BUSY = -1,
  STOP = 0,
  STOPPING = 1,
  STARTING = 2,
  RUNNING = 3
}
export const INSTANCE_STATUS_TEXT: Record<number, string> = {
  [INSTANCE_STATUS.BUSY]: t("TXT_CODE_342a04a9"),
  [INSTANCE_STATUS.STOP]: t("TXT_CODE_15f2e564"),
  [INSTANCE_STATUS.STOPPING]: t("TXT_CODE_a409b8a9"),
  [INSTANCE_STATUS.STARTING]: t("TXT_CODE_175b570d"),
  [INSTANCE_STATUS.RUNNING]: t("TXT_CODE_bdb620b9")
};

export interface IAdvancedInstanceInfo {
  instanceUuid: string;
  daemonId: string;
  hostIp?: string;
  remarks?: string;
  status?: number;
  nickname?: string;
  ie?: string;
  oe?: string;
  endTime?: number;
  lastDatetime?: number;
  stopCommand?: string;
  processType?: string;
  docker?: Record<string, any>;
  info?: Record<string, any>;
  permissions?: UserPermissions;
}

// Multi-forward operation method
export function multiOperationForwarding(
  instances: any[],
  callback: (daemonId: string, instanceUuids: string[]) => void
) {
  // classification table
  const map = new Map<string, string[]>();
  // Classify remote hosts and instance IDs based on information
  for (const instanceInfo of instances) {
    const daemonId: string = instanceInfo.daemonId;
    const instanceUuid: string = instanceInfo.instanceUuid;
    if (map.has(daemonId)) {
      map.get(daemonId)?.push(instanceUuid);
    } else {
      map.set(daemonId, [instanceUuid]);
    }
  }
  // Pack and forward the classified data separately
  for (const iterator of map) {
    const daemonId = iterator[0];
    const instanceUuids = iterator[1];
    callback(daemonId, instanceUuids);
  }
}

export async function getInstancesByUuid(
  uuid: string,
  targetDaemonId?: string,
  advanced: boolean = false,
  includePermissions: boolean = false
) {
  const user = userSystem.getInstance(uuid);
  if (!user) throw new Error("The UID does not exist");

  // Advanced functions are optional, analyze each instance data
  let resInstances: IAdvancedInstanceInfo[] = [];
  if (advanced) {
    const instances = user.instances;
    for (const iterator of instances) {
      if (targetDaemonId && targetDaemonId !== iterator.daemonId) continue;
      const remoteService = RemoteServiceSubsystem.getInstance(iterator.daemonId);
      if (!remoteService) {
        // If the remote service doesn't exist at all, load a deleted prompt
        resInstances.push({
          hostIp: "-- Unknown --",
          instanceUuid: iterator.instanceUuid,
          daemonId: iterator.daemonId,
          status: -1,
          nickname: "-- Unknown --",
          remarks: "",
          ie: "",
          oe: "",
          endTime: 0,
          lastDatetime: 0,
          stopCommand: "",
          processType: "",
          docker: {},
          info: {},
          permissions: iterator.permissions
        });
        continue;
      }
      // Note: UUID can be integrated here to save the returned traffic, and this optimization will not be done for the time being
      let instancesInfo = await new RemoteRequest(remoteService).request("instance/section", {
        instanceUuids: [iterator.instanceUuid]
      });
      if (!instancesInfo || instancesInfo.length === 0) continue;
      instancesInfo = instancesInfo[0];
      resInstances.push({
        hostIp: `${remoteService.config.ip}:${remoteService.config.port}`,
        remarks: remoteService.config.remarks,
        instanceUuid: instancesInfo.instanceUuid,
        daemonId: remoteService.uuid,
        status: instancesInfo.status,
        nickname: instancesInfo.config.nickname,
        ie: instancesInfo.config.ie,
        oe: instancesInfo.config.oe,
        endTime: instancesInfo.config.endTime,
        lastDatetime: instancesInfo.config.lastDatetime,
        stopCommand: instancesInfo.config.stopCommand,
        processType: instancesInfo.config.processType,
        docker: instancesInfo.config.docker || {},
        info: instancesInfo.info || {},
        permissions: iterator.permissions
      });
    }
  } else {
    // When not advanced, return instances with permissions
    // User needs their own permissions for UI to work
    resInstances = user.instances;
  }

  // respond to user data
  const response: any = {
    uuid: user.uuid,
    userName: user.userName,
    loginTime: user.loginTime,
    registerTime: user.registerTime,
    instances: resInstances,
    permission: user.permission,
    apiKey: user.apiKey,
    isInit: user.isInit,
    open2FA: user.open2FA,
    secret: user.secret,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    token: ""
  };

  // Only include subUsers for admin requests
  if (includePermissions) {
    response.subUsers = user.subUsers;
  }

  return response;
}

export function checkInstanceAdvancedParams(
  config: IGlobalInstanceConfig,
  isTopPermission: boolean = false
) {
  const canChangeCmd = systemConfig?.allowChangeCmd;
  if (!isTopPermission) {
    if (!canChangeCmd) return {};
    if (config.processType !== "docker") return {};
  }

  const startCommand = toText(config.startCommand);
  const updateCommand = toText(config.updateCommand);
  const dockerEnv = Array.isArray(config.docker?.env) ? config.docker.env : null;

  return {
    startCommand,
    updateCommand,
    docker: {
      env: dockerEnv
    }
  };
}
