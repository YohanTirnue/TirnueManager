import { useDefineApi } from "@/stores/useDefineApi";
import type { InstanceDetail, NodeStatus, PanelStatus, Settings } from "@/types";
import type {
  BaseUserInfo,
  EditUserInfo,
  LoginUserInfo,
  UserInstance,
  UserPermissions
} from "@/types/user";

export const panelInstall = useDefineApi<
  {
    data: {
      username: string;
      password: string;
    };
  },
  any
>({
  url: "/api/auth/install",
  method: "POST"
});

export const updateSettings = useDefineApi<
  {
    data: {
      language: string;
    };
  },
  any
>({
  url: "/api/overview/install",
  method: "PUT"
});

export const panelStatus = useDefineApi<any, PanelStatus>({
  url: "/api/auth/status",
  method: "GET"
});

export const loginUser = useDefineApi<
  | {
      // Post
      data: {
        username: string;
        password: string;
        code?: string;
        turnstileToken?: string;
      };
    }
  | undefined,
  // Response
  string
>({
  url: "/api/auth/login",
  method: "POST"
});

export const loginPageInfo = useDefineApi<
  any,
  {
    loginInfo: string;
  }
>({
  url: "/api/auth/login_info",
  method: "GET"
});

export const logoutUser = useDefineApi<any, any>({
  url: "/api/auth/logout",
  method: "GET"
});

export const userInfoApi = useDefineApi<any, LoginUserInfo>({
  url: "/api/auth/"
});

export const userInfoApiAdvanced = useDefineApi<
  {
    params: {
      uuid: string;
      advanced: boolean;
    };
  },
  BaseUserInfo
>({
  url: "/api/auth/"
});

export const remoteNodeList = useDefineApi<any, NodeStatus[]>({
  url: "/api/service/remote_services_list"
});

export const remoteInstances = useDefineApi<
  {
    params: {
      daemonId: string;
      page: number;
      page_size: number;
      instance_name?: string;
      status?: string;
      tag?: string;
    };
  },
  {
    maxPage: 1;
    page: 1;
    pageSize: 10;
    data: InstanceDetail[];
    allTags: string[];
  }
>({
  url: "/api/service/remote_service_instances"
});

export const remoteAllInstances = useDefineApi<
  {
    params: {
      page: number;
      page_size: number;
      instance_name?: string;
      status?: string;
      tag?: string;
    };
  },
  {
    maxPage: number;
    page: number;
    pageSize: number;
    data: (InstanceDetail & { daemonId: string; daemonRemarks: string; daemonIp: string; daemonPort: number })[];
    allTags: string[];
  }
>({
  url: "/api/service/remote_service_all_instances"
});

export const settingInfo = useDefineApi<any, Settings>({
  url: "/api/overview/setting"
});

export const setSettingInfo = useDefineApi<
  | {
      data: Settings;
    }
  | undefined,
  string
>({
  url: "/api/overview/setting",
  method: "PUT"
});

export const getUserInfo = useDefineApi<
  {
    params: {
      userName: string;
      page: number;
      page_size: number;
      role: string;
    };
  },
  { total: number; pageSize: number; page: number; maxPage: number; data: BaseUserInfo[] }
>({
  url: "/api/auth/search",
  method: "GET"
});

export const deleteUser = useDefineApi<
  {
    data: string[];
  },
  any
>({
  url: "/api/auth",
  method: "DELETE"
});

export const addUser = useDefineApi<
  {
    data: {
      username: string;
      password: string;
      permission: number;
      permissions: UserPermissions;
    };
  },
  {
    uuid: string;
  }
>({
  url: "/api/auth",
  method: "POST"
});

export const editUserInfo = useDefineApi<
  {
    data: {
      config: EditUserInfo;
      uuid: string;
    };
  },
  boolean
>({
  url: "/api/auth",
  method: "PUT"
});

export const updateUserInstance = useDefineApi<
  {
    data: {
      config: {
        instances: UserInstance[];
      };
      uuid: string;
    };
  },
  boolean
>({
  url: "/api/auth",
  method: "PUT"
});

export const overviewInfo = useDefineApi<any, IPanelOverviewResponse>({
  url: "/api/overview"
});

export const editNode = useDefineApi<
  {
    params: {
      uuid: string;
    };
    data: {
      apiKey?: string;
      ip?: string;
      port?: number;
      remarks?: string;
      setting?: any;
    };
  },
  any
>({
  url: "/api/service/remote_service",
  method: "PUT"
});

export const addNode = useDefineApi<
  {
    data: {
      ip: string;
      port: number;
      remarks: string;
      apiKey: string;
    };
  },
  any
>({
  url: "/api/service/remote_service",
  method: "POST"
});

export const deleteNode = useDefineApi<
  {
    params: {
      uuid: string;
    };
  },
  any
>({
  url: "/api/service/remote_service",
  method: "DELETE"
});

export const connectNode = useDefineApi<
  {
    params: {
      uuid: string;
    };
  },
  any
>({
  url: "/api/service/link_remote_service",
  method: "GET"
});

// Sub-User Management APIs
export const getSubUsers = useDefineApi<
  {
    params: {
      daemonId: string;
      instanceUuid: string;
    };
  },
  any[]
>({
  url: "/api/sub-users",
  method: "GET"
});

export const getInstanceTeams = useDefineApi<
  {
    params: {
      daemonId: string;
      instanceUuid: string;
    };
  },
  any[]
>({
  url: "/api/sub-users/teams",
  method: "GET"
});

export const getParentUsers = useDefineApi<
  {
    params: {
      daemonId: string;
      instanceUuid: string;
    };
  },
  Array<{
    uuid: string;
    userName: string;
    permission: number;
  }>
>({
  url: "/api/sub-users/parents",
  method: "GET"
});

export const createSubUser = useDefineApi<
  {
    params: {
      daemonId: string;
      instanceUuid: string;
    };
    data: {
      userName: string;
      passWord: string;
      permissions?: UserPermissions;
      parentUuid?: string;
    };
  },
  any
>({
  url: "/api/sub-users",
  method: "POST"
});

export const updateSubUserPermissions = useDefineApi<
  {
    params: {
      subUserUuid: string;
    };
    data: {
      permissions: UserPermissions;
    };
  },
  any
>({
  url: "/api/sub-users/:subUserUuid",
  method: "PUT"
});

export const deleteSubUser = useDefineApi<
  {
    params: {
      subUserUuid: string;
    };
  },
  any
>({
  url: "/api/sub-users/:subUserUuid",
  method: "DELETE"
});
