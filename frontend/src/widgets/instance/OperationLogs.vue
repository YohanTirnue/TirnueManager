<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import type { LayoutCard } from "@/types";
import type { OperationLoggerItem } from "@/types/operationLog";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { getInstanceOperationLog } from "@/services/apis/operationLog";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAppStateStore } from "@/stores/useAppStateStore";
import {
  ReloadOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FileOutlined,
  PlayCircleOutlined,
  StopOutlined,
  RedoOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  CodeOutlined,
  LockOutlined
} from "@ant-design/icons-vue";

const props = defineProps<{
  card: LayoutCard;
}>();

const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
const instanceId = getMetaOrRouteValue("instanceId");
const daemonId = getMetaOrRouteValue("daemonId");

// Permission checks
const { canViewLogs, isAdmin } = useUserPermissions();
const { state } = useAppStateStore();
const isSubUser = computed(() => state.userInfo?.isSubUser ?? false);
const hasLogPermission = computed(() => {
  // Sub-users can NEVER view logs
  if (isSubUser.value) return false;
  // Admins always have permission
  if (isAdmin.value) return true;
  // Regular users need canViewLogs permission
  return canViewLogs.value;
});

const logs = ref<OperationLoggerItem[]>([]);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = ref(10);

// Filters
const filterUser = ref("");
const filterAction = ref("");

// Action type options for filter
const actionOptions = [
  { value: "", label: "All Actions" },
  { value: "instance_start", label: "Start" },
  { value: "instance_stop", label: "Stop" },
  { value: "instance_restart", label: "Restart" },
  { value: "instance_kill", label: "Kill" },
  { value: "instance_config_change", label: "Config Change" },
  { value: "instance_file_upload", label: "Upload" },
  { value: "instance_file_download", label: "Download" },
  { value: "instance_file_update", label: "Edit File" },
  { value: "instance_file_delete", label: "Delete File" },
  { value: "instance_file_copy", label: "Copy" },
  { value: "instance_file_move", label: "Move" },
  { value: "instance_file_mkdir", label: "Create Directory" },
  { value: "instance_file_chmod", label: "Change Permissions" },
  { value: "instance_file_compress", label: "Compress" },
  { value: "instance_file_touch", label: "Create File" },
  { value: "instance_command", label: "Command" },
  { value: "instance_task_create", label: "Create Task" },
  { value: "instance_task_delete", label: "Delete Task" }
];

const fetchLogs = async () => {
  if (!instanceId || !daemonId) return;
  if (!hasLogPermission.value) return;
  loading.value = true;
  try {
    const { execute, state } = getInstanceOperationLog();
    await execute({
      params: {
        uuid: instanceId,
        daemonId: daemonId,
        limit: 200
      }
    });
    logs.value = (state.value || []).reverse();
  } catch (error) {
    console.error("Failed to fetch operation logs:", error);
  } finally {
    loading.value = false;
  }
};

// Filtered logs
const filteredLogs = computed(() => {
  let result = logs.value;

  if (filterUser.value) {
    result = result.filter(log =>
      log.operator_name?.toLowerCase().includes(filterUser.value.toLowerCase())
    );
  }

  if (filterAction.value) {
    result = result.filter(log => log.type === filterAction.value);
  }

  return result;
});

// Paginated logs
const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredLogs.value.slice(start, end);
});

// Total pages
const total = computed(() => filteredLogs.value.length);

// Format date
const formatDate = (timestamp: string) => {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get action display name
const getActionName = (type: string) => {
  const actionMap: Record<string, string> = {
    instance_start: "Started",
    instance_stop: "Stopped",
    instance_restart: "Restarted",
    instance_kill: "Killed",
    instance_config_change: "Config Changed",
    instance_file_upload: "Uploaded",
    instance_file_download: "Downloaded",
    instance_file_update: "Edited",
    instance_file_delete: "Deleted",
    instance_file_copy: "Copied",
    instance_file_move: "Moved",
    instance_file_mkdir: "Created Dir",
    instance_file_chmod: "Changed Perms",
    instance_file_compress: "Compressed",
    instance_file_touch: "Created File",
    instance_command: "Command",
    instance_task_create: "Task Created",
    instance_task_delete: "Task Deleted"
  };
  return actionMap[type] || type;
};

// Get action icon
const getActionIcon = (type: string) => {
  if (type.includes("start")) return PlayCircleOutlined;
  if (type.includes("stop")) return StopOutlined;
  if (type.includes("restart")) return RedoOutlined;
  if (type.includes("upload")) return UploadOutlined;
  if (type.includes("download")) return DownloadOutlined;
  if (type.includes("delete")) return DeleteOutlined;
  if (type.includes("update") || type.includes("edit")) return EditOutlined;
  if (type.includes("config")) return SettingOutlined;
  if (type.includes("command")) return CodeOutlined;
  return FileOutlined;
};

// Get action color
const getActionColor = (type: string, level: string) => {
  if (level === "error") return "#ff4d4f";
  if (level === "warning") return "#faad14";
  if (type.includes("start")) return "#52c41a";
  if (type.includes("stop") || type.includes("kill")) return "#ff4d4f";
  if (type.includes("delete")) return "#ff7875";
  if (type.includes("upload")) return "#1890ff";
  if (type.includes("download")) return "#722ed1";
  return "#d4af37";
};

// Get details from log
const getDetails = (log: OperationLoggerItem) => {
  const details: string[] = [];
  if ('command' in log && log.command) details.push(log.command);
  if ('file' in log && log.file) details.push(log.file);
  if ('target' in log && log.target) details.push(log.target);
  if ('source' in log && log.source) details.push(log.source);
  if ('task_name' in log && log.task_name) details.push(log.task_name);
  return details.join(", ") || "-";
};

// Reset filters
const resetFilters = () => {
  filterUser.value = "";
  filterAction.value = "";
  currentPage.value = 1;
};

// Watch for filter changes to reset page
watch([filterUser, filterAction], () => {
  currentPage.value = 1;
});

onMounted(() => {
  fetchLogs();
});
</script>

<template>
  <CardPanel class="operation-logs-panel" style="height: 100%">
    <template #title>
      {{ card.title || "Operation Logs" }}
    </template>
    <template #operator>
      <a-button type="text" :loading="loading" @click="fetchLogs">
        <ReloadOutlined />
      </a-button>
    </template>
    <template #body>
      <!-- No Permission Message -->
      <div v-if="!hasLogPermission" class="no-permission">
        <LockOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px" />
        <p style="color: #999; margin: 0">You do not have permission to view operation logs</p>
      </div>

      <div v-else class="logs-container">
        <!-- Filters -->
        <div class="filters-section">
          <a-input
            v-model:value="filterUser"
            placeholder="Filter by user..."
            style="width: 180px"
            allow-clear
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-input>

          <a-select
            v-model:value="filterAction"
            style="width: 180px"
            placeholder="Filter by action"
          >
            <a-select-option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>

          <a-button v-if="filterUser || filterAction" @click="resetFilters">
            Clear Filters
          </a-button>

          <span class="results-count">
            {{ filteredLogs.length }} entries
          </span>
        </div>

        <!-- Logs Table -->
        <div class="logs-table-wrapper">
          <a-table
            :data-source="paginatedLogs"
            :loading="loading"
            :pagination="false"
            size="small"
            row-key="operation_id"
          >
            <a-table-column title="Time" data-index="operation_time" :width="160">
              <template #default="{ record }">
                <span class="time-cell">
                  <ClockCircleOutlined />
                  {{ formatDate(record.operation_time) }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="User" data-index="operator_name" :width="120">
              <template #default="{ record }">
                <span class="user-cell">
                  <UserOutlined />
                  {{ record.operator_name || "Unknown" }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="Action" data-index="type" :width="140">
              <template #default="{ record }">
                <a-tag :color="getActionColor(record.type, record.operation_level)">
                  <component :is="getActionIcon(record.type)" />
                  {{ getActionName(record.type) }}
                </a-tag>
              </template>
            </a-table-column>

            <a-table-column title="Details" data-index="details">
              <template #default="{ record }">
                <span class="details-cell">{{ getDetails(record) }}</span>
              </template>
            </a-table-column>

            <a-table-column title="IP" data-index="operator_ip" :width="120">
              <template #default="{ record }">
                <span class="ip-cell">{{ record.operator_ip || "-" }}</span>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <!-- Pagination -->
        <div class="pagination-section">
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :show-size-changer="true"
            :page-size-options="['10', '20', '50', '100']"
            size="small"
            show-quick-jumper
          />
        </div>
      </div>
    </template>
  </CardPanel>
</template>

<style scoped lang="scss">
.operation-logs-panel {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%);
  border: 1px solid rgba(255, 140, 66, 0.3);
  border-radius: 12px;
}

.no-permission {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.logs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}

.filters-section {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  flex-wrap: wrap;

  .results-count {
    margin-left: auto;
    color: rgba(255, 255, 255, 0.6);
    font-size: 12px;
  }
}

.logs-table-wrapper {
  flex: 1;
  overflow: auto;

  :deep(.ant-table) {
    background: transparent;

    .ant-table-thead > tr > th {
      background: rgba(40, 40, 40, 0.8);
      color: #d4af37;
      border-bottom: 1px solid rgba(255, 140, 66, 0.3);
      font-weight: 600;
      font-size: 12px;
    }

    .ant-table-tbody > tr > td {
      background: transparent;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.85);
      font-size: 12px;
      padding: 8px 12px;
    }

    .ant-table-tbody > tr:hover > td {
      background: rgba(255, 140, 66, 0.1);
    }
  }
}

.time-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d4af37;
  font-weight: 500;
}

.details-cell {
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ip-cell {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  font-family: monospace;
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 8px 0;

  :deep(.ant-pagination) {
    .ant-pagination-item {
      background: rgba(40, 40, 40, 0.8);
      border-color: rgba(255, 140, 66, 0.3);

      a {
        color: rgba(255, 255, 255, 0.85);
      }

      &-active {
        border-color: #ff8c42;

        a {
          color: #ff8c42;
        }
      }
    }

    .ant-pagination-prev,
    .ant-pagination-next {
      .ant-pagination-item-link {
        background: rgba(40, 40, 40, 0.8);
        border-color: rgba(255, 140, 66, 0.3);
        color: rgba(255, 255, 255, 0.85);
      }
    }
  }
}
</style>
