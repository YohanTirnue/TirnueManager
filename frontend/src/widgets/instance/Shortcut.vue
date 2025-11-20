<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { openInstanceTagsEditor, useDeleteInstanceDialog } from "@/components/fc/index";
import PermissionBanner from "@/components/PermissionBanner.vue";
import TextContainer from "@/components/TextContainer.vue";
import { useAppRouters } from "@/hooks/useAppRouters";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { useInstanceInfo, verifyEULA } from "@/hooks/useInstance";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { t } from "@/lang/i18n";
import {
  killInstance,
  openInstance,
  restartInstance,
  stopInstance,
  updateInstance
} from "@/services/apis/instance";
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";
import { arrayFilter } from "@/tools/array";
import { formatMemoryUsage } from "@/tools/memory";
import { parseTimestamp } from "@/tools/time";
import { reportErrorMsg } from "@/tools/validator";
import type { InstanceDetail, LayoutCard } from "@/types/index";
import {
  CheckCircleOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  TagsOutlined,
  UserOutlined
} from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import _ from "lodash";
import { computed, ref } from "vue";

const props = defineProps<{
  card: LayoutCard;
  targetInstanceInfo?: InstanceDetail;
  targetDaemonId?: string;
  daemonName?: string;
}>();

const emits = defineEmits(["refreshList"]);

const { containerState } = useLayoutContainerStore();
const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
const { toPage } = useAppRouters();
const instanceId = props.targetInstanceInfo?.instanceUuid || getMetaOrRouteValue("instanceId");
const daemonId = props.targetDaemonId || getMetaOrRouteValue("daemonId");

const { statusText, isRunning, isStopped, instanceTypeText, instanceInfo } = useInstanceInfo({
  instanceId: props.targetInstanceInfo ? undefined : instanceId,
  daemonId: props.targetInstanceInfo ? undefined : daemonId,
  autoRefresh: props.targetInstanceInfo ? false : true,
  instanceInfo: props.targetInstanceInfo ? ref(props.targetInstanceInfo) : undefined
});

const { canPerformInstanceAction, userPermissions, isAdmin } = useUserPermissions();

// Get user's available instance permissions
const availablePermissions = computed(() => {
  if (isAdmin.value) return null; // Admins don't need permission notices
  const perms = userPermissions.value;
  const available = [];
  if (perms.canStartInstances) available.push("Start");
  if (perms.canStopInstances) available.push("Stop");
  if (perms.canRestartInstances) available.push("Restart");
  if (perms.canAccessConsole) available.push("Console");
  if (perms.canViewLogs) available.push("Logs");
  return available.length > 0 ? available : ["Limited Access"];
});

const operationConfig = {
  params: {
    uuid: instanceId || "",
    daemonId: daemonId || ""
  }
};

const { isLoading: openLoading, execute: executeOpen } = openInstance();
const { isLoading: stopLoading, execute: executeStop } = stopInstance();
const { isLoading: restartLoading, execute: executeRestart } = restartInstance();
const { isLoading: killLoading, execute: executeKill } = killInstance();
const { isLoading: updateLoading, execute: executeUpdate } = updateInstance();

const refreshList = () => {
  setTimeout(() => {
    emits("refreshList");
  }, 500);
};

const actions = {
  start: async () => {
    const flag = await verifyEULA(instanceId ?? "", daemonId ?? "");
    if (!flag) return;
    await executeOpen(operationConfig);
    message.success(t("TXT_CODE_e13abbb1"));
  },
  stop: async () => {
    await executeStop(operationConfig);
    message.success(t("TXT_CODE_efb6d377"));
  },
  restart: async () => {
    await executeRestart(operationConfig);
    message.success(t("TXT_CODE_efb6d377"));
  },
  kill: async () => {
    await executeKill(operationConfig);
    message.success(t("TXT_CODE_efb6d377"));
  },
  update: async () => {
    await executeUpdate({
      params: {
        uuid: instanceId || "",
        daemonId: daemonId || "",
        task_name: "update"
      },
      data: {
        time: new Date().getTime()
      }
    });
    message.success(t("TXT_CODE_b1600db0"));
  }
};

const execInstanceAction = async (
  event: MouseEvent,
  actName: "start" | "stop" | "restart" | "kill" | "update"
) => {
  const action = actions[actName];
  try {
    if (action) {
      await action();
      refreshList();
    }
  } catch (error) {
    reportErrorMsg(error);
  }
};

const instanceOperations = computed(() =>
  arrayFilter([
    {
      title: t("TXT_CODE_57245e94"),
      icon: PlayCircleOutlined,
      click: async (event: MouseEvent) => {
        event.stopPropagation();
        await execInstanceAction(event, "start");
      },
      loading: openLoading.value,
      disabled: containerState.isDesignMode,
      condition: () => isStopped.value && canPerformInstanceAction(instanceId ?? "", "canStartInstances")
    },
    {
      title: t("TXT_CODE_b1dedda3"),
      icon: PauseCircleOutlined,
      click: (event: MouseEvent) => {
        event.stopPropagation();
        Modal.confirm({
          title: t("TXT_CODE_893567ac"),
          content: t("TXT_CODE_6da85509"),
          onOk: async () => {
            execInstanceAction(event, "stop");
          }
        });
        return false;
      },
      loading: stopLoading.value,
      disabled: containerState.isDesignMode,
      condition: () => isRunning.value && canPerformInstanceAction(instanceId ?? "", "canStopInstances")
    },
    {
      title: t("TXT_CODE_47dcfa5"),
      icon: RedoOutlined,
      click: async (event: MouseEvent) => {
        event.stopPropagation();
        Modal.confirm({
          title: t("TXT_CODE_893567ac"),
          content: t("TXT_CODE_f6bd907d"),
          onOk: async () => {
            execInstanceAction(event, "restart");
          }
        });
      },
      loading: restartLoading.value,
      disabled: containerState.isDesignMode,
      condition: () => isRunning.value && canPerformInstanceAction(instanceId ?? "", "canRestartInstances")
    },
    {
      title: t("TXT_CODE_40ca4f2"),
      icon: CloudDownloadOutlined,
      click: async (event: MouseEvent) => {
        event.stopPropagation();
        execInstanceAction(event, "update");
      },
      loading: updateLoading.value,
      disabled: containerState.isDesignMode,
      condition: () => isStopped.value
    },
    {
      title: t("TXT_CODE_7b67813a"),
      icon: CloseOutlined,
      click: async (event: MouseEvent) => {
        event.stopPropagation();
        Modal.confirm({
          title: t("TXT_CODE_893567ac"),
          content: t("TXT_CODE_ec08484"),
          onOk: async () => {
            execInstanceAction(event, "kill");
          }
        });
      },
      loading: killLoading.value,
      disabled: containerState.isDesignMode,
      danger: true,
      condition: () => !isStopped.value
    },
    {
      area: true
    },
    {
      title: t("TXT_CODE_78e88c3f"),
      icon: TagsOutlined,
      click: async (event: MouseEvent) => {
        event.stopPropagation();
        if (instanceId && daemonId) {
          const tags = instanceInfo.value?.config.tag || [];
          const newTags = await openInstanceTagsEditor(instanceId, daemonId, tags);
          if (!_.isEqual(newTags, tags)) refreshList();
        }
      },
      disabled: containerState.isDesignMode
    },
    {
      title: t("TXT_CODE_524e3036"),
      icon: CodeOutlined,
      click: (event: MouseEvent) => {
        event.stopPropagation();
        toPage({
          path: "/instances/terminal",
          query: {
            daemonId,
            instanceId
          }
        });
      },
      disabled: containerState.isDesignMode
    },
    {
      title: t("TXT_CODE_a0e19f38"),
      icon: DeleteOutlined,
      click: async (event: MouseEvent) => {
        event.stopPropagation();
        const deleteInstanceResult = await useDeleteInstanceDialog(
          instanceId || "",
          daemonId || ""
        );
        if (!deleteInstanceResult) return;
        message.success(t("TXT_CODE_f486dbb4"));
        refreshList();
      },
      danger: true,
      disabled: containerState.isDesignMode
    }
  ])
);
</script>

<template>
  <CardPanel style="width: 100%; height: 100%; position: relative; min-height: 340px">
    <template #title>
      <div class="instance-title">
        {{ instanceInfo?.config.nickname }}
      </div>
      <div v-if="daemonName" class="daemon-name">
        <DatabaseOutlined />
        {{ daemonName }}
      </div>
    </template>
    <template #operator> </template>
    <template #body>
      <div class="instance-card-body">
        <div class="instance-header">
          <div class="mb-12 flex" style="flex-wrap: wrap; gap: 12px">
            <a-tag class="m-0 status-tag" :class="{ 'status-running': isRunning, 'status-stopped': isStopped }">
              <span v-if="isRunning">
                <CheckCircleOutlined />
                {{ statusText }}
              </span>
              <span v-else-if="isStopped">
                <ExclamationCircleOutlined />
                {{ statusText }}
              </span>
              <span v-else>
                <ExclamationCircleOutlined />
                {{ statusText }}
              </span>
            </a-tag>
            <a-tag class="m-0 type-tag">
              {{ instanceTypeText }}
            </a-tag>
            <div v-if="instanceInfo?.config.tag && instanceInfo?.config.tag.length > 0" class="tag-divider">|</div>
            <a-tag v-for="item in instanceInfo?.config.tag" :key="item" class="m-0 custom-tag">
              {{ item }}
            </a-tag>
          </div>

          <div class="instance-info-grid">
            <div class="instance-info-line">
              <span class="title">{{ t("TXT_CODE_34611898") }}</span>
              <span class="value"> {{ parseTimestamp(instanceInfo?.config.lastDatetime) }}</span>
            </div>
            <div v-if="instanceInfo?.config.endTime" class="instance-info-line">
              <span class="title">{{ t("TXT_CODE_fa920c0") }}</span>
              <span class="value"> {{ parseTimestamp(instanceInfo?.config.endTime) }}</span>
            </div>
            <div
              v-if="
                instanceInfo?.config?.docker?.image && instanceInfo?.config?.processType === 'docker'
              "
              class="instance-info-line"
            >
              <span class="title">{{ t("TXT_CODE_77000411") }}</span>
              <span class="value">
                <TextContainer :text="instanceInfo?.config?.docker?.image" :max-length="26" />
              </span>
            </div>
            <div v-if="instanceInfo?.info.memoryUsage" class="instance-info-line">
              <span class="title">{{ t("TXT_CODE_593ee330") }}</span>
              <span class="value">
                {{
                  formatMemoryUsage(instanceInfo?.info.memoryUsage, instanceInfo?.info.memoryLimit)
                }}
              </span>
            </div>
            <div v-if="instanceInfo?.info.mcPingOnline" class="instance-info-line">
              <span class="title">{{ t("TXT_CODE_e4dce83f") }}</span>
              <span class="value" style="vertical-align: middle">
                <UserOutlined />
                {{ instanceInfo?.info.currentPlayers }} / {{ instanceInfo?.info.maxPlayers }}
              </span>
            </div>
          </div>
        </div>

        <PermissionBanner
          type="custom"
          :customPermissions="availablePermissions || []"
          theme="orange"
        />

        <div class="action-buttons-grid" :class="{ 'centered-grid': instanceOperations.length <= 3 }">
          <template v-for="item in instanceOperations" :key="item.title">
            <div v-if="!item.area" class="action-btn-wrapper">
              <a-button
                :loading="item.loading"
                :disabled="item.disabled"
                :danger="item.danger"
                @click="item.click"
                :class="['action-btn-modern', { 'btn-danger': item.danger }]"
              >
                <component :is="item.icon" class="btn-icon"></component>
                <span class="btn-text">{{ item.title }}</span>
              </a-button>
            </div>
          </template>
        </div>
      </div>
    </template>
  </CardPanel>
</template>

<style lang="scss" scoped>
// Modern Instance Card with Large Buttons
.instance-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.daemon-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-gray-7);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.instance-card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  gap: 20px;
}

.instance-header {
  flex: 1;
}

// Status & Type Tags - Bigger and Better
.status-tag {
  padding: 8px 18px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-running {
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
}

.status-stopped {
  background: linear-gradient(135deg, #faad14 0%, #ffc53d 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(250, 173, 20, 0.3);
}

.type-tag {
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.15), rgba(212, 175, 55, 0.15));
  color: #FF8C42;
  border: 2px solid rgba(255, 140, 66, 0.3);
  border-radius: 10px;
}

.custom-tag {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  background: var(--color-gray-2);
  border: 1px solid var(--color-gray-4);
  border-radius: 8px;
}

.tag-divider {
  opacity: 0.3;
  margin: 0 6px;
  font-size: 16px;
}

// Info Grid - Cleaner Layout
.instance-info-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 16px;
}

.instance-info-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 14px;
  padding: 10px 12px;
  background: rgba(255, 140, 66, 0.03);
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 140, 66, 0.08);
  }

  .title {
    font-weight: 600;
    color: #FF8C42;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .value {
    flex: 1;
    text-align: right;
    opacity: 0.95;
    font-weight: 500;
    font-size: 14px;
  }
}

// Permission Notice Banner
.permission-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.08), rgba(212, 175, 55, 0.08));
  border: 2px solid rgba(255, 140, 66, 0.25);
  border-radius: 10px;
  margin-top: 16px;

  .permission-icon {
    font-size: 20px;
    color: #FF8C42;
    flex-shrink: 0;
  }

  .permission-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .permission-label {
    font-size: 12px;
    font-weight: 600;
    color: #FF8C42;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .permission-list {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-gray-10);
  }
}

// MASSIVE Action Buttons Grid - The Main Feature!
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding-top: 16px;
  border-top: 2px solid rgba(255, 140, 66, 0.15);

  // Center buttons when there are 3 or fewer
  &.centered-grid {
    justify-content: center;
    grid-template-columns: repeat(auto-fit, minmax(140px, 200px));
    max-width: 700px;
    margin: 0 auto;
  }
}

.action-btn-wrapper {
  width: 100%;
}

.action-btn-modern {
  width: 100%;
  height: 52px !important; // MUCH BIGGER - was 38px
  border-radius: 12px !important;
  border: 2px solid rgba(255, 140, 66, 0.2) !important;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.05), rgba(212, 175, 55, 0.05)) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
  color: var(--color-gray-10) !important;

  .btn-icon {
    font-size: 20px !important;
    transition: transform 0.3s ease;
  }

  .btn-text {
    font-size: 14px;
    font-weight: 600;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%) !important;
    border-color: #FF8C42 !important;
    color: white !important;
    transform: translateY(-3px) !important;
    box-shadow: 0 6px 20px rgba(255, 140, 66, 0.4) !important;

    .btn-icon {
      transform: scale(1.15);
    }
  }

  &:active:not(:disabled) {
    transform: translateY(-1px) !important;
    box-shadow: 0 3px 12px rgba(255, 140, 66, 0.3) !important;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.btn-danger {
    background: linear-gradient(135deg, rgba(255, 77, 79, 0.08), rgba(255, 77, 79, 0.05)) !important;
    border-color: rgba(255, 77, 79, 0.3) !important;
    color: #ff4d4f !important;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%) !important;
      border-color: #ff4d4f !important;
      color: white !important;
      box-shadow: 0 6px 20px rgba(255, 77, 79, 0.4) !important;
    }
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .action-buttons-grid {
    grid-template-columns: 1fr 1fr; // 2 columns on mobile
    gap: 10px;
  }

  .action-btn-modern {
    height: 48px !important;
    font-size: 13px !important;

    .btn-icon {
      font-size: 18px !important;
    }

    .btn-text {
      font-size: 13px;
    }
  }
}

@media (max-width: 480px) {
  .action-buttons-grid {
    grid-template-columns: 1fr; // 1 column on very small screens
  }
}
</style>
