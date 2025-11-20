import { useDefineApi } from "@/stores/useDefineApi";
import type { OperationLoggerItem } from "@/types/operationLog";

export const getOperationLog = useDefineApi<
  {
    data: {
      limit?: number;
    };
  },
  OperationLoggerItem[]
>({
  url: "/api/overview/operation_logs",
  method: "GET"
});

export const getInstanceOperationLog = useDefineApi<
  {
    params: {
      uuid: string;
      daemonId: string;
      limit?: number;
    };
  },
  OperationLoggerItem[]
>({
  url: "/api/protected_instance/operation_logs",
  method: "GET"
});
