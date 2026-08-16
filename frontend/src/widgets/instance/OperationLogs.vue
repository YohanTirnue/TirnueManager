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
  return "var(--theme-primary-color)";
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
      <CodeOutlined style="margin-right: 8px; color: var(--theme-primary-color)" />
      {{ card.title || "Operation Logs" }}
    </template>
    <template #operator>
      <a-button type="text" :loading="loading" @click="fetchLogs" style="color: var(--color-text-2)">
        <ReloadOutlined />
      </a-button>
    </template>
    <template #body>
      <!-- No Permission Message -->
      <div v-if="!hasLogPermission" class="no-permission">
        <LockOutlined style="font-size: 48px; color: #555; margin-bottom: 16px" />
        <p style="color: #888; margin: 0">You do not have permission to view operation logs.</p>
      </div>

      <div v-else class="console-container">
        <!-- Minimal Filters -->
        <div class="console-toolbar">
          <input
            v-model="filterUser"
            class="console-input"
            placeholder="Search user..."
            @keyup.enter="currentPage = 1"
          />
          <select v-model="filterAction" class="console-select" @change="currentPage = 1">
            <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <span v-if="filterUser || filterAction" class="console-clear" @click="resetFilters">clear</span>
          <span class="console-status">{{ filteredLogs.length }} lines found</span>
        </div>

        <!-- Terminal Logs Window -->
        <div class="console-window">
          <div v-if="loading" class="console-line">
            <span class="console-time">[{{ new Date().toLocaleTimeString('en-US', {hour12: false}) }}]</span>
            <span class="console-user">[system]</span>
            <span class="console-action" style="color: #ff9800">[loading]</span>
            <span class="console-details">Fetching logs...</span>
          </div>
          
          <div v-else-if="paginatedLogs.length === 0" class="console-line">
            <span class="console-time">[{{ new Date().toLocaleTimeString('en-US', {hour12: false}) }}]</span>
            <span class="console-user">[system]</span>
            <span class="console-action" style="color: #ff9800">[info]</span>
            <span class="console-details">No logs found.</span>
          </div>

          <div
            v-for="record in paginatedLogs"
            :key="record.operation_id"
            class="console-line"
          >
            <span class="console-time">[{{ formatDate(record.operation_time) }}]</span>
            <span class="console-user">[{{ record.operator_name || "System" }}]</span>
            <span class="console-action" :style="{ color: getActionColor(record.type, 'info') }">
              [{{ getActionName(record.type).toLowerCase() }}]
            </span>
            <span class="console-details">
              <template v-if="record.type === 'instance_command' && record.command">
                <span class="cmd-prefix">$</span> {{ record.command }}
              </template>
              <template v-else>
                {{ getDetails(record) }}
              </template>
            </span>
          </div>
        </div>

        <!-- Minimal Console Pagination -->
        <div class="console-footer" v-if="total > pageSize">
          <span class="console-nav" :class="{ disabled: currentPage === 1 }" @click="currentPage > 1 && currentPage--">
            &lt; prev
          </span>
          <span class="console-pages">page {{ currentPage }} / {{ Math.ceil(total / pageSize) }}</span>
          <span class="console-nav" :class="{ disabled: currentPage >= Math.ceil(total / pageSize) }" @click="currentPage < Math.ceil(total / pageSize) && currentPage++">
            next &gt;
          </span>
        </div>
      </div>
    </template>
  </CardPanel>
</template>

<style scoped lang="scss">
.operation-logs-panel {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
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

.console-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  font-family: 'Consolas', 'Courier New', Courier, monospace;
}

.console-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #1e1e1e;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #333;
}

.console-input, .console-select {
  background: transparent;
  border: none;
  border-bottom: 1px solid #555;
  color: #a0a0a0;
  font-family: inherit;
  font-size: 13px;
  padding: 2px 6px;
  outline: none;
  
  &:focus {
    border-bottom: 1px solid #00ff00;
    color: #fff;
  }
}

.console-select {
  width: 140px;
  cursor: pointer;

  option {
    background: #1e1e1e;
    color: #e0e0e0;
  }
}

.console-clear {
  color: #ff4d4f;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  
  &:hover {
    color: #ff7875;
  }
}

.console-status {
  margin-left: auto;
  color: #666;
  font-size: 12px;
}

.console-window {
  flex: 1;
  background: #0d0d0d;
  border-radius: 6px;
  border: 1px solid #333;
  padding: 12px;
  overflow-y: auto;
  color: #ccc;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #111;
  }
  &::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 4px;
  }
}

.console-line {
  word-break: break-all;
  display: flex;
  gap: 10px;
  
  &:hover {
    background: rgba(255,255,255,0.05);
  }
}

.console-time {
  color: #888;
  white-space: nowrap;
}

.console-user {
  color: #56b6c2;
  white-space: nowrap;
}

.console-action {
  white-space: nowrap;
  font-weight: bold;
}

.console-details {
  color: #e0e0e0;
  flex: 1;
}

.cmd-prefix {
  color: #e5c07b;
  font-weight: bold;
}

.console-footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  align-items: center;
  background: #1e1e1e;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #333;
  font-size: 12px;
}

.console-nav {
  color: #00ff00;
  cursor: pointer;
  
  &:hover {
    color: #aaffaa;
    text-decoration: underline;
  }
  
  &.disabled {
    color: #555;
    cursor: not-allowed;
    text-decoration: none;
  }
}

.console-pages {
  color: #888;
}

// Mobile responsive styles
@media (max-width: 768px) {
  .console-toolbar {
    flex-wrap: wrap;
    
    .console-input, .console-select {
      flex: 1;
      min-width: 100px;
    }
  }

  .console-line {
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #333;
    
    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
  }
}
</style>
