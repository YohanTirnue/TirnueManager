<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { openMarketDialog, openRenewalDialog } from "@/components/fc";
import IconBtn from "@/components/IconBtn.vue";
import PermissionBanner from "@/components/PermissionBanner.vue";
import TerminalCore from "@/components/TerminalCore.vue";
import TerminalTags from "@/components/TerminalTags.vue";
import SubUserManager from "@/components/SubUserManager.vue";
import FileManager from "./FileManager.vue";
import ServerConfigOverview from "./ServerConfigOverview.vue";
import Schedule from "./Schedule.vue";
import InstanceOperationLogs from "./OperationLogs.vue";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { INSTANCE_TYPE_TRANSLATION, verifyEULA } from "@/hooks/useInstance";
import { useScreen } from "@/hooks/useScreen";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { t } from "@/lang/i18n";
import {
  killInstance,
  openInstance,
  restartInstance,
  stopInstance,
  updateInstance
} from "@/services/apis/instance";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { sleep } from "@/tools/common";
import { reportErrorMsg } from "@/tools/validator";
import type { LayoutCard } from "@/types";
import { INSTANCE_STATUS } from "@/types/const";
import {
  ApartmentOutlined,
  BlockOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CloudDownloadOutlined,
  CloudServerOutlined,
  DashboardOutlined,
  DownOutlined,
  InfoCircleOutlined,
  InteractionOutlined,
  LaptopOutlined,
  LoadingOutlined,
  MoneyCollectOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RedoOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  ControlOutlined,
  FieldTimeOutlined,
  ProfileOutlined
} from "@ant-design/icons-vue";
import { useLocalStorage } from "@vueuse/core";
import prettyBytes, { type Options as PrettyOptions } from "pretty-bytes";
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import type { TagInfo } from "../../components/interface";


import { GLOBAL_INSTANCE_NAME } from "../../config/const";
import { useTerminal, type UseTerminalHook } from "../../hooks/useTerminal";
import { arrayFilter } from "../../tools/array";
import { parseTimestamp } from "../../tools/time";

// Format date with month name
const formatDateWithMonth = (timestamp: number | string | undefined) => {
  if (!timestamp) return '-';
  const val = typeof timestamp === "string" ? new Date(timestamp).getTime() : timestamp;
  if (isNaN(val)) return '-';
  return parseTimestamp(val);
};

const props = defineProps<{
  card: LayoutCard;
}>();

const { isPhone } = useScreen();
const { state, isAdmin } = useAppStateStore();
const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
const { canPerformInstanceAction, userPermissions, hasInstanceAccess } = useUserPermissions();

// The `useTerminal` is shared by this component and `TerminalCore`.
// Please do not initialize `useTerminal` in this component; all initialization logic should be placed in its child component `TerminalCore.vue`.
// The state of the shared terminal is used here.
const terminalHook: UseTerminalHook = useTerminal();
const {
  state: instanceInfo,
  isStopped,
  isRunning,
  isBuys,
  isGlobalTerminal,
  isDockerMode,
  clearTerminal
} = terminalHook;

const instanceId = getMetaOrRouteValue("instanceId");
const daemonId = getMetaOrRouteValue("daemonId");
const viewType = getMetaOrRouteValue("viewType", false);
const innerTerminalType = computed(() => props.card.width === 12 && viewType === "inner");
const instanceTypeText = computed(
  () => INSTANCE_TYPE_TRANSLATION[instanceInfo.value?.config.type ?? -1]
);
const hasConsoleAccess = computed(() =>
  canPerformInstanceAction(instanceId ?? "", "canAccessConsole")
);

const fileManagerVisible = ref(false);
const serverConfigVisible = ref(false);
const scheduleVisible = ref(false);
const operationLogsVisible = ref(false);

// Sub-user management
const subUserManagerVisible = ref(false);
const canManageSubUsers = computed(() => {
  const userInfo = state.userInfo;
  if (!userInfo) return false;
  if (userInfo.isSubUser) return false;

  // Admins and moderators can always manage
  if (userInfo.permission >= 5) return true;

  // Regular users must own this instance
  if (userInfo.permission === 1) {
    const ownsInstance = userInfo.instances?.some(
      (inst: any) => inst.instanceUuid === instanceInfo.value?.instanceUuid
    );
    return !!ownsInstance;
  }

  return false;
});

// Get maxSubUsers for current instance from user's instances
const currentInstanceMaxSubUsers = computed(() => {
  const userInfo = state.userInfo;
  if (!userInfo?.instances) return 3;

  const instance = userInfo.instances.find(
    (inst: any) => inst.instanceUuid === instanceInfo.value?.instanceUuid
  );
  return instance?.maxSubUsers ?? 3;
});

const { execute: requestOpenInstance, isLoading: isOpenInstanceLoading } = openInstance();

const toOpenInstance = async () => {
  clearTerminal();
  try {
    if (instanceInfo.value?.config?.type?.startsWith("minecraft/java")) {
      const flag = await verifyEULA(instanceId ?? "", daemonId ?? "");
      if (!flag) return;
      await sleep(1000);
    }

    await requestOpenInstance({
      params: {
        uuid: instanceId ?? "",
        daemonId: daemonId ?? ""
      }
    });
  } catch (error: any) {
    reportErrorMsg(error);
  }
};

const updateCmd = computed(() => (instanceInfo.value?.config.updateCommand ? true : false));
const instanceStatusText = computed(() => INSTANCE_STATUS[instanceInfo.value?.status ?? -1]);
const quickOperations = computed(() =>
  arrayFilter([
    {
      title: t("TXT_CODE_57245e94"),
      icon: PlayCircleOutlined,
      noConfirm: false,
      type: "default",
      class: "button-color-success",
      click: toOpenInstance,
      props: {},
      condition: () => isStopped.value
    },
    {
      title: t("TXT_CODE_b1dedda3"),
      icon: PauseCircleOutlined,
      type: "default",
      click: async () => {
        try {
          await stopInstance().execute({
            params: {
              uuid: instanceId || "",
              daemonId: daemonId || ""
            }
          });
        } catch (error: any) {
          reportErrorMsg(error);
        }
      },
      props: {
        danger: true
      },
      condition: () => isRunning.value
    },
    {
      title: t("TXT_CODE_47dcfa5"),
      icon: RedoOutlined,
      type: "default",
      noConfirm: false,
      class: "button-color-warning",
      click: async () => {
        try {
          await restartInstance().execute({
            params: {
              uuid: instanceId || "",
              daemonId: daemonId || ""
            }
          });
        } catch (error: any) {
          reportErrorMsg(error);
        }
      },
      condition: () => isRunning.value
    },
    {
      title: t("TXT_CODE_d07742fe"),
      icon: ControlOutlined,
      noConfirm: true,
      click: () => { serverConfigVisible.value = true; },
      condition: () => !isGlobalTerminal.value && (isAdmin.value || userPermissions.value.canAccessConfigFiles)
    },
    {
      title: t("TXT_CODE_ae533703"),
      icon: FolderOpenOutlined,
      noConfirm: true,
      click: () => { fileManagerVisible.value = true; },
      condition: () => hasInstanceAccess(instanceId ?? "") && (isAdmin.value || userPermissions.value.canAccessFileManager)
    },
    {
      title: t("TXT_CODE_b7d026f8"),
      icon: FieldTimeOutlined,
      noConfirm: true,
      click: () => { scheduleVisible.value = true; },
      condition: () => !isGlobalTerminal.value && (isAdmin.value || userPermissions.value.canAccessScheduledTasks)
    },
    {
      title: "Operation Logs",
      icon: ProfileOutlined,
      noConfirm: true,
      click: () => { operationLogsVisible.value = true; },
      condition: () => true
    }
  ])
);
const instanceOperations = computed(() =>
  arrayFilter([
    {
      title: t("TXT_CODE_7b67813a"),
      icon: CloseOutlined,
      type: "danger",
      class: "color-warning",
      click: async () => {
        try {
          await killInstance().execute({
            params: {
              uuid: instanceId || "",
              daemonId: daemonId || ""
            }
          });
        } catch (error: any) {
          reportErrorMsg(error);
        }
      },
      condition: () => !isStopped.value
    },
    {
      title: t("TXT_CODE_40ca4f2"),
      type: "default",
      icon: CloudDownloadOutlined,
      click: async () => {
        try {
          clearTerminal();
          await updateInstance().execute({
            params: {
              uuid: instanceId || "",
              daemonId: daemonId || "",
              task_name: "update"
            },
            data: {
              time: new Date().getTime()
            }
          });
        } catch (error: any) {
          reportErrorMsg(error);
        }
      },
      condition: () => isStopped.value && updateCmd.value
    },
    {
      title: t("TXT_CODE_f77093c8"),
      icon: MoneyCollectOutlined,
      noConfirm: true,
      click: async () => {
        await openRenewalDialog(
          instanceInfo.value?.instanceUuid ?? "",
          daemonId ?? "",
          instanceInfo.value?.config.category ?? 0
        );
      },
      props: {},
      condition: () => !!instanceInfo.value?.config?.category
    }
  ])
);

const getInstanceName = computed(() => {
  if (instanceInfo.value?.config.nickname === GLOBAL_INSTANCE_NAME) {
    return t("TXT_CODE_5bdaf23d");
  } else {
    return instanceInfo.value?.config.nickname;
  }
});

const useByteUnit = useLocalStorage("useByteUnit", true); // true: bytes, false: bits
const prettyBytesConfig: PrettyOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  binary: true
};

const getUsageColor = (percentage?: number) => {
  percentage = Number(percentage);
  if (percentage > 600) return "error";
  if (percentage > 200) return "warning";
  return "default";
};

const formatMemoryUsage = (usage?: number, limit?: number) => {
  const fUsage = prettyBytes(usage ?? 0, prettyBytesConfig);
  const fLimit = prettyBytes(limit ?? 0, prettyBytesConfig);

  return limit ? `${fUsage} / ${fLimit}` : fUsage;
};

const formatNetworkSpeed = (bytes?: number) =>
  useByteUnit.value
    ? prettyBytes(bytes ?? 0, { ...prettyBytesConfig, binary: false }) + "/s"
    : prettyBytes((bytes ?? 0) * 8, { ...prettyBytesConfig, bits: true, binary: false }).replace(/bit$/, "b") +
      "ps";

const terminalTopTags = computed<TagInfo[]>(() => {
  const info = instanceInfo.value?.info;
  if (!info || isStopped.value) return [];
  const { cpuUsage, memoryUsage, memoryLimit, memoryUsagePercent, rxBytes, txBytes } = info;

  return arrayFilter<TagInfo>([
    {
      label: t("TXT_CODE_b862a158"),
      value: `${parseInt(String(cpuUsage))}%`,
      color: getUsageColor(cpuUsage),
      icon: BlockOutlined,
      condition: () => cpuUsage != null
    },
    {
      label: t("TXT_CODE_593ee330"),
      value: formatMemoryUsage(memoryUsage, memoryLimit),
      color: getUsageColor(memoryUsagePercent),
      icon: DashboardOutlined,
      condition: () => memoryUsage != null
    },
    {
      label: t("TXT_CODE_50daec4"),
      value: `↓${formatNetworkSpeed(rxBytes)} · ↑${formatNetworkSpeed(txBytes)}`,
      icon: ApartmentOutlined,
      condition: () => rxBytes != null || txBytes != null,
      onClick: () => {
        useByteUnit.value = !useByteUnit.value;
      }
    }
  ]);
});
</script>

<template>
  <!-- COMPACT 3-ROW LAYOUT (Default View) -->
  <div class="compact-terminal-container">
    <PermissionBanner type="instance" theme="default" />

    <!-- ROW 1: Header | Basic Info | Buttons -->
    <div class="top-bar">
      <!-- Header Section -->
      <div class="header-section" v-if="isPhone">
        <h1 class="instance-name">{{ getInstanceName }}</h1>
      </div>

      <!-- Basic Info integrated into header -->
      <div class="info-stats">
        <!-- Runtime stats when running -->
        <template v-if="!isStopped && terminalTopTags.length">
          <div v-for="tag in terminalTopTags" :key="tag.label" class="stat-item" @click="tag.onClick">
            <component :is="tag.icon" class="stat-icon" />
            <div class="stat-content">
              <span class="stat-label">{{ tag.label }}</span>
              <span class="stat-value" :class="`value-${tag.color}`">{{ tag.value }}</span>
            </div>
          </div>
        </template>
        <!-- Expiration date -->
        <div class="stat-item" v-if="instanceInfo?.config.endTime">
          <CalendarOutlined class="stat-icon" />
          <div class="stat-content">
            <span class="stat-label">Expires</span>
            <span class="stat-value">{{ formatDateWithMonth(instanceInfo?.config.endTime) }}</span>
          </div>
        </div>
        <!-- Last access -->
        <div class="stat-item">
          <ClockCircleOutlined class="stat-icon" />
          <div class="stat-content">
            <span class="stat-label">Last Access</span>
            <span class="stat-value">{{ formatDateWithMonth(instanceInfo?.config.lastDatetime) }}</span>
          </div>
        </div>
      </div>

      <!-- Buttons Section -->
      <div class="buttons-section" v-if="!isPhone">
        <template v-for="item in quickOperations" :key="item.title">
          <a-popconfirm v-if="!item.noConfirm" :title="t('TXT_CODE_276756b2')" @confirm="item.click">
            <a-button
              size="large"
              :class="['action-btn', item.class, item.props?.danger ? 'btn-danger' : '']"
            >
              <template #icon>
                <component :is="item.icon" />
              </template>
              {{ item.title }}
            </a-button>
          </a-popconfirm>
          <a-button
            v-else
            size="large"
            :class="['action-btn', item.class, item.props?.danger ? 'btn-danger' : '']"
            @click="item.click"
          >
            <template #icon>
              <component :is="item.icon" />
            </template>
            {{ item.title }}
          </a-button>
        </template>
        <!-- Manage Users Button -->
        <a-button
          v-if="canManageSubUsers"
          size="large"
          class="action-btn button-color-users"
          @click="subUserManagerVisible = true"
        >
          <template #icon>
            <TeamOutlined />
          </template>
          Manage Users
        </a-button>
        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item v-for="item in instanceOperations" :key="item.title" @click="item.click">
                <component :is="item.icon"></component>
                <span>&nbsp;{{ item.title }}</span>
              </a-menu-item>
            </a-menu>
          </template>
          <a-button size="large" class="action-btn">
            <template #icon>
              <DownOutlined />
            </template>
            {{ t("TXT_CODE_fe731dfc") }}
          </a-button>
        </a-dropdown>
      </div>
      <div class="buttons-section" v-else>
        <!-- Manage Users Button for mobile -->
        <a-button
          v-if="canManageSubUsers"
          size="large"
          class="action-btn manage-users-btn"
          @click="subUserManagerVisible = true"
        >
          <template #icon>
            <TeamOutlined />
          </template>
          Manage Users
        </a-button>
        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item
                v-for="item in [...quickOperations, ...instanceOperations]"
                :key="item.title"
                @click="item.click"
              >
                <component :is="item.icon" />
                {{ item.title }}
              </a-menu-item>
            </a-menu>
          </template>
          <a-button size="large" class="action-btn">
            <template #icon>
              <DownOutlined />
            </template>
            {{ t("TXT_CODE_fe731dfc") }}
          </a-button>
        </a-dropdown>
      </div>
    </div>

    <a-modal v-model:open="fileManagerVisible" :footer="null" :title="t('TXT_CODE_ae533703')" width="75%">
      <FileManager :card="props.card" v-if="fileManagerVisible" />
    </a-modal>

    <a-modal v-model:open="serverConfigVisible" :footer="null" :title="t('TXT_CODE_d07742fe')" width="75%">
      <ServerConfigOverview :card="props.card" v-if="serverConfigVisible" />
    </a-modal>

    <a-modal v-model:open="scheduleVisible" :footer="null" :title="t('TXT_CODE_b7d026f8')" width="75%">
      <Schedule :card="props.card" v-if="scheduleVisible" />
    </a-modal>

    <a-modal v-model:open="operationLogsVisible" :footer="null" title="Operation Logs" width="75%">
      <InstanceOperationLogs :card="props.card" v-if="operationLogsVisible" />
    </a-modal>

    <!-- ROW 2: Console with iOS-style header -->
    <div class="glass-terminal-wrapper">
      <div class="terminal-glass-header">
        <div class="terminal-dots">
          <span class="dot dot-red" :class="{ active: isStopped }"></span>
          <span class="dot dot-yellow" :class="{ active: isBuys || instanceInfo?.status === 1 || instanceInfo?.status === 2 }"></span>
          <span class="dot dot-green" :class="{ active: isRunning }"></span>
        </div>
        <span class="terminal-title">Console</span>
        <span class="terminal-instance-name">{{ getInstanceName }}</span>
        <div style="flex: 1"></div>
      </div>
      <div class="console-section">
        <TerminalCore
          v-if="instanceId && daemonId && hasConsoleAccess"
          :use-terminal-hook="terminalHook"
          :instance-id="instanceId"
          :daemon-id="daemonId"
          :height="'100%'"
        />
        <div v-else-if="!hasConsoleAccess" class="access-denied">
          <CloseOutlined style="font-size: 48px; margin-bottom: 16px;" />
          <h3>Access Denied</h3>
          <p>You do not have permission to access the console for this instance.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Sub-User Manager Modal -->
  <SubUserManager
    v-model:visible="subUserManagerVisible"
    :daemon-id="daemonId ?? ''"
    :instance-uuid="instanceId ?? ''"
    :max-sub-users="currentInstanceMaxSubUsers"
  />
</template>


<style lang="scss" scoped>
// COMPACT 3-ROW LAYOUT
.compact-terminal-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: calc(100vh - 136px);
  padding: 0 8px 8px 8px;
  box-sizing: border-box;
}

// ROW 1: TOP BAR - Header | Stats | Buttons
.top-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%);
  border-radius: 12px;
  border: 1px solid var(--theme-shadow-hover);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);

  .header-section { order: 1; margin-right: 8px; }
  .buttons-section { order: 2; margin-right: 8px; }
  .info-stats { order: 3; margin-left: auto; }
}

// Header Section
.header-section {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.header-info {
  min-width: 0;
}

.instance-name {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.status-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

// Info Stats - integrated into header
.info-stats {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.stat-icon {
  font-size: 14px;
  color: var(--theme-primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.2;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.3;

  &.value-error {
    color: #ff4d4f;
  }

  &.value-warning {
    color: #faad14;
  }
}

// Buttons Section
.buttons-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

:deep(.action-btn) {
  position: relative;
  display: flex !important;
  align-items: center;
  justify-content: flex-start !important;
  gap: 0 !important;
  width: auto !important;
  max-width: 44px !important;
  height: 44px !important;
  padding: 4px !important;
  background: transparent !important;
  border: 2px solid #ffffff !important;
  border-radius: 22px !important;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  box-shadow: none !important;

  .anticon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px !important;
    height: 32px !important;
    flex-shrink: 0;
    margin: 0 !important;
    font-size: 18px !important;
    color: #ffffff !important;
    transition: all 0.4s ease;
  }

  span:not(.anticon) {
    opacity: 0;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff !important;
    transform: translateX(-10px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    max-width: 200px !important;
    border-radius: 12px !important;
    padding: 4px 14px 4px 4px !important;
    gap: 8px !important;
    transform: translateY(-2px);
    background: #ffffff !important;
    border-color: #ffffff !important;

    .anticon {
      transform: scale(1.1);
      color: #000000 !important;
    }

    span:not(.anticon) {
      opacity: 1;
      transform: translateX(0);
      color: #000000 !important;
      transition-delay: 0.1s;
    }
  }

  &:active {
    transform: translateY(0);
  }
}

// Status Orb (smaller)
.status-orb {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-pulse {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--theme-shadow-hover), rgba(212, 175, 55, 0.1));
  filter: blur(6px);
  animation: orb-pulse 2s ease-in-out infinite;
}

.orb-ring {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--theme-primary-color), var(--theme-primary-color));
  box-shadow: 0 0 12px var(--theme-shadow-hover);
}

.orb-running {
  .orb-pulse {
    background: radial-gradient(circle, rgba(82, 196, 26, 0.5), rgba(82, 196, 26, 0.1));
  }
  .orb-ring {
    background: radial-gradient(circle, #52c41a, #73d13d);
    box-shadow: 0 0 15px rgba(82, 196, 26, 0.7);
  }
}

.orb-busy {
  .orb-pulse {
    background: radial-gradient(circle, rgba(255, 193, 7, 0.5), rgba(255, 193, 7, 0.1));
  }
  .orb-ring {
    background: radial-gradient(circle, #ffc107, #ffeb3b);
    box-shadow: 0 0 15px rgba(255, 193, 7, 0.7);
  }
}

.orb-stopped {
  .orb-pulse {
    animation: none;
    opacity: 0.3;
  }
  .orb-ring {
    background: radial-gradient(circle, #666, #888);
    box-shadow: 0 0 5px rgba(100, 100, 100, 0.3);
  }
}

@keyframes orb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.2); opacity: 0.3; }
}

// iOS-style Glass Terminal Wrapper
.glass-terminal-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: none; /* Optimized */
  -webkit-backdrop-filter: none; /* Optimized */ /* Optimized */
  border: 1px solid var(--theme-shadow-hover);
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 20px var(--theme-shadow-hover),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.terminal-glass-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.9) 100%);
  border-bottom: 1px solid var(--theme-shadow-hover);
}

.terminal-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;

  &.dot-red {
    background: darkred;
    &.active {
      background: linear-gradient(135deg, #ff5f57, #ff3b30);
      box-shadow: 0 0 8px rgba(255, 59, 48, 0.6);
    }
  }

  &.dot-yellow {
    background: #8c4600;
    &.active {
      background: linear-gradient(135deg, #ffbd2e, #ff9500);
      box-shadow: 0 0 8px rgba(255, 149, 0, 0.6);
    }
  }

  &.dot-green {
    background: darkgreen;
    &.active {
      background: linear-gradient(135deg, #28c840, #30d158);
      box-shadow: 0 0 8px rgba(48, 209, 88, 0.6);
    }
  }
}

.terminal-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}

.terminal-instance-name {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 40%;
}

// ROW 2: Console Section
.console-section {
  flex: 1;
  min-height: 300px;
  background: #0d0d0d;
  overflow: hidden;
}

.access-denied {
  padding: 40px;
  text-align: center;
  color: #ff4d4f;

  h3 {
    color: var(--theme-primary-color);
  }
}

// MOBILE OPTIMIZATIONS
@media (max-width: 992px) {
  .top-bar {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .header-section {
    justify-content: center;
  }

  .stats-section {
    justify-content: center;
  }

  .buttons-section {
    justify-content: center;
  }

  .instance-name {
    font-size: 18px;
    text-align: center;
  }

  .status-chips {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .compact-terminal-container {
    padding: 4px;
    gap: 8px;
  }

  .top-bar {
    padding: 12px;
  }

  .stats-section {
    flex-direction: column;
    gap: 8px;
  }

  .instance-name {
    font-size: 16px;
  }

  .status-orb {
    width: 32px;
    height: 32px;
  }

  .orb-ring,
  .orb-pulse {
    width: 24px;
    height: 24px;
  }
}

// ERROR CARD & CONSOLE WRAPPER (Keep existing)
.error-card {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  z-index: 10;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;

  .error-card-container {
    overflow: hidden;
    max-width: 440px;
    border: 1px solid var(--color-gray-6) !important;
    background-color: var(--color-gray-1);
    border-radius: 4px;
    padding: 12px;
    box-shadow: 0px 0px 2px var(--color-gray-7);
  }

  @media (max-width: 992px) {
    .error-card-container {
      max-width: 90vw !important;
    }
  }
}

.console-wrapper {
  position: relative;

  .terminal-loading {
    z-index: 12;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .terminal-wrapper {
    border: 1px solid var(--card-border-color);
    position: relative;
    overflow: hidden;
    height: 100%;
    background-color: #1e1e1e;
    padding: 8px;
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    
    .terminal-container {
      height: 100%;
    }

    margin-bottom: 12px;
  }

  .command-input {
    position: relative;

    .history {
      display: flex;
      max-width: 100%;
      overflow: scroll;
      z-index: 10;
      position: absolute;
      top: -35px;
      left: 0;

      li {
        list-style: none;
        span {
          padding: 3px 20px;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
        }
      }

      &::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
      }
    }
  }
}
</style>
