import { useDefineApi } from "@/stores/useDefineApi";

export const setUserApiKey = useDefineApi<
  {
    data: {
      enable: boolean;
    };
  },
  string
>({
  url: "/api/auth/api",
  method: "PUT"
});

export const updatePassword = useDefineApi<
  {
    data: {
      passWord: string;
    };
  },
  boolean
>({
  url: "/api/auth/update",
  method: "PUT"
});

export const bind2FA = useDefineApi<any, string>({
  url: "/api/auth/bind2fa",
  method: "POST"
});

export const confirm2FA = useDefineApi<
  {
    data: {
      enable: boolean;
    };
  },
  undefined
>({
  url: "/api/auth/confirm2fa",
  method: "POST"
});

export const queryUsername = useDefineApi<
  {
    params: {
      username: string;
    };
  },
  {
    uuid?: string;
    userName?: string;
  }
>({
  url: "/api/auth/query_username",
  method: "GET"
});

// Owned Daemon APIs
export const assignOwnedDaemon = useDefineApi<
  {
    data: {
      userUuid: string;
      daemonId: string;
      instanceLimit: number;
      ramLimitMB: number;
    };
  },
  {
    success: boolean;
    ownedDaemon?: any;
    error?: string;
  }
>({
  url: "/api/owned_daemons/assign",
  method: "POST"
});

export const updateOwnedDaemonLimit = useDefineApi<
  {
    data: {
      userUuid: string;
      daemonId: string;
      instanceLimit: number;
      ramLimitMB: number;
    };
  },
  {
    success: boolean;
    ownedDaemon?: any;
    error?: string;
  }
>({
  url: "/api/owned_daemons/update",
  method: "PUT"
});

export const removeOwnedDaemon = useDefineApi<
  {
    data: {
      userUuid: string;
      daemonId: string;
    };
  },
  {
    success: boolean;
    error?: string;
  }
>({
  url: "/api/owned_daemons/remove",
  method: "DELETE"
});

export const getUsersWithOwnedDaemons = useDefineApi<any, {
  success: boolean;
  users?: any[];
  error?: string;
}>({
  url: "/api/owned_daemons/users_with_owned_daemons",
  method: "GET"
});

export const getMyOwnedDaemons = useDefineApi<any, {
  success: boolean;
  ownedDaemons?: any[];
  error?: string;
}>({
  url: "/api/owned_daemons/my_daemons",
  method: "GET"
});

export const createInstanceOnOwnedDaemon = useDefineApi<
  {
    data: {
      daemonId: string;
      config: any;
      ramAllocatedMB: number;
    };
  },
  {
    success: boolean;
    instance?: any;
    error?: string;
  }
>({
  url: "/api/owned_daemons/create_instance",
  method: "POST"
});
