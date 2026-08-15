<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { openInstanceTagsEditor, useDeleteInstanceDialog, openMarketDialog } from "@/components/fc/index";
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
import { useAppStateStore } from "@/stores/useAppStateStore";
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
  ShopOutlined,
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
const { state } = useAppStateStore();
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

// Check if user is a sub-user (backend property)
const isSubUser = computed(() => {
  return state.userInfo?.isSubUser ?? false;
});

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
      title: "Remake Your Server!",
      icon: ShopOutlined,
      click: async (event: MouseEvent): Promise<void> => {
        event.stopPropagation();
        try {
          await openMarketDialog(daemonId ?? "", instanceId ?? "", {
            autoInstall: true
          });
          refreshList();
        } catch (error: any) {
          // User cancelled or error occurred
        }
      },
      disabled: containerState.isDesignMode,
      // Admins always see it, regular users need canAccessServerMarket permission
      condition: () => {
        if (!isStopped.value) return false;
        if (isSubUser.value) return false;
        if (isAdmin.value) return true;
        return userPermissions.value.canAccessServerMarket;
      }
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
  <CardPanel class="instance-card-panel">
    <template #title>
      <div class="instance-title-wrapper">
        <div class="instance-title">
          {{ instanceInfo?.config.nickname }}
        </div>
        <div v-if="daemonName && isAdmin" class="daemon-name">
          <DatabaseOutlined class="daemon-icon" />
          {{ daemonName }}
        </div>
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
          theme="default"
        />

        <div class="action-buttons-container">
          <template v-for="item in instanceOperations" :key="item.title">
            <div v-if="!item.area" class="action-btn-wrapper">
              <a-button
                :loading="item.loading"
                :disabled="item.disabled"
                :danger="item.danger"
                @click="item.click"
                :class="['action-btn-symmetrical', { 'btn-danger': item.danger }]"
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
.instance-card-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.instance-card-panel:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.1);
}

.instance-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.instance-title {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daemon-name {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 6px;

  .daemon-icon {
    font-size: 11px;
  }
}

.instance-card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 24px;
}

.instance-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// Status & Type Tags - Symmetrical & Clean
.status-tag {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-running {
  background: rgba(82, 196, 26, 0.15);
  color: #52c41a;
  border: 1px solid rgba(82, 196, 26, 0.3);
}

.status-stopped {
  background: rgba(250, 173, 20, 0.15);
  color: #faad14;
  border: 1px solid rgba(250, 173, 20, 0.3);
}

.type-tag {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.custom-tag {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.6);
}

.tag-divider {
  opacity: 0.2;
  margin: 0 4px;
  font-size: 14px;
}

// Info Grid - Symmetrical 2-column layout
.instance-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 4px;
}

.instance-info-line {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .title {
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// Permission Notice Banner
.permission-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--theme-primary-gradient);
  border: 2px solid var(--theme-shadow-hover);
  border-radius: 10px;
  margin-top: 16px;

  .permission-icon {
    font-size: 20px;
    color: var(--theme-primary-color);
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
    color: var(--theme-primary-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .permission-list {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-gray-10);
  }
}

// Symmetrical Action Buttons Grid
.action-buttons-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.action-btn-wrapper {
  width: 100%;
}

.action-btn-symmetrical {
  width: 100%;
  height: 44px !important;
  border-radius: 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(255, 255, 255, 0.03) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  color: rgba(255, 255, 255, 0.8) !important;
  transition: all 0.2s ease !important;
  box-shadow: none !important;

  .btn-icon {
    font-size: 16px !important;
    opacity: 0.8;
  }

  .btn-text {
    font-size: 13px;
    font-weight: 600;
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    color: #ffffff !important;
    transform: translateY(-2px) !important;

    .btn-icon {
      opacity: 1;
    }
  }

  &:active:not(:disabled) {
    transform: translateY(0) !important;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &.btn-danger {
    background: rgba(255, 77, 79, 0.05) !important;
    border-color: rgba(255, 77, 79, 0.2) !important;
    color: #ff4d4f !important;

    &:hover:not(:disabled) {
      background: rgba(255, 77, 79, 0.15) !important;
      border-color: rgba(255, 77, 79, 0.4) !important;
      color: #ff4d4f !important;
    }
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .instance-info-grid {
    grid-template-columns: 1fr; // Stack info lines on very small screens
  }
  
  .action-buttons-container {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .action-btn-symmetrical {
    height: 40px !important;
    font-size: 12px !important;

    .btn-icon {
      font-size: 14px !important;
    }
  }
}
</style>
