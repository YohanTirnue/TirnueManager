<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { openMarketDialog, openRenewalDialog } from "@/components/fc";
import IconBtn from "@/components/IconBtn.vue";
import PermissionBanner from "@/components/PermissionBanner.vue";
import TerminalCore from "@/components/TerminalCore.vue";
import TerminalTags from "@/components/TerminalTags.vue";
import SubUserManager from "@/components/SubUserManager.vue";
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
  TeamOutlined
} from "@ant-design/icons-vue";
import { useLocalStorage } from "@vueuse/core";
import prettyBytes, { type Options as PrettyOptions } from "pretty-bytes";
import { computed, ref } from "vue";
import type { TagInfo } from "../../components/interface";
import { GLOBAL_INSTANCE_NAME } from "../../config/const";
import { useTerminal, type UseTerminalHook } from "../../hooks/useTerminal";
import { arrayFilter } from "../../tools/array";
import { parseTimestamp } from "../../tools/time";

const props = defineProps<{
  card: LayoutCard;
}>();

const { isPhone } = useScreen();
const { state, isAdmin } = useAppStateStore();
const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
const { canPerformInstanceAction } = useUserPermissions();

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

// Sub-user management
const subUserManagerVisible = ref(false);
const canManageSubUsers = computed(() => {
  const userInfo = state.userInfo;
  if (!userInfo) return false;
  return !userInfo.isSubUser && (userInfo.permission === 10 || userInfo.permission === 1);
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
    }
  ])
);
const instanceOperations = computed(() =>
  arrayFilter([
    {
      title: t("TXT_CODE_47dcfa5"),
      icon: RedoOutlined,
      type: "default",
      noConfirm: false,
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
      title: t("TXT_CODE_b19ed1dd"),
      icon: InteractionOutlined,
      noConfirm: true,
      click: async () => {
        try {
          clearTerminal();
          await openMarketDialog(daemonId ?? "", instanceId ?? "", {
            autoInstall: true,
            onlyDockerTemplate: isDockerMode.value
          });
        } catch (error: any) {
          // ignore
        }
      },
      props: {},
      condition: () =>
        isStopped.value &&
        (state.settings.allowUsePreset || isAdmin.value) &&
        !isGlobalTerminal.value
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
    },
    {
      title: "Manage Sub-Users",
      icon: TeamOutlined,
      noConfirm: true,
      click: () => {
        subUserManagerVisible.value = true;
      },
      props: {},
      condition: () => canManageSubUsers.value
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
    <PermissionBanner type="instance" theme="orange" />

    <!-- ROW 1: Header | Basic Info | Buttons -->
    <div class="top-bar">
      <!-- Header Section -->
      <div class="header-section">
        <div class="status-orb" :class="{ 'orb-running': isRunning, 'orb-busy': isBuys, 'orb-stopped': isStopped }">
          <div class="orb-pulse"></div>
          <div class="orb-ring"></div>
        </div>
        <div class="header-info">
          <h1 class="instance-name">{{ getInstanceName }}</h1>
          <div class="status-chips">
            <a-tag v-if="isRunning" color="green">
              <CheckCircleOutlined />
              {{ instanceStatusText }}
            </a-tag>
            <a-tag v-else-if="isBuys" color="orange">
              <LoadingOutlined />
              {{ instanceStatusText }}
            </a-tag>
            <a-tag v-else>
              <InfoCircleOutlined />
              {{ instanceStatusText }}
            </a-tag>
            <a-tag v-if="instanceTypeText" color="purple">
              <CloudServerOutlined />
              {{ instanceTypeText }}
            </a-tag>
          </div>
        </div>
      </div>

      <!-- Basic Info Section -->
      <div class="stats-section">
        <div class="stats-title">Basic Information</div>
        <div class="stats-items">
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
          <!-- Basic instance info -->
          <div class="stat-item" v-if="instanceInfo?.config.endTime">
            <CalendarOutlined class="stat-icon" />
            <div class="stat-content">
              <span class="stat-label">{{ t("TXT_CODE_ae747cc0") }}</span>
              <span class="stat-value">{{ parseTimestamp(instanceInfo?.config.endTime) || t("TXT_CODE_e3a77a77") }}</span>
            </div>
          </div>
          <div class="stat-item">
            <ClockCircleOutlined class="stat-icon" />
            <div class="stat-content">
              <span class="stat-label">{{ t("TXT_CODE_46f575ae") }}</span>
              <span class="stat-value">{{ parseTimestamp(instanceInfo?.config.lastDatetime) || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Buttons Section -->
      <div class="buttons-section" v-if="!isPhone">
        <span v-for="item in quickOperations" :key="item.title" class="action-btn-wrapper">
          <a-popconfirm v-if="!item.noConfirm" :title="t('TXT_CODE_276756b2')" @confirm="item.click">
            <IconBtn :icon="item.icon" :title="item.title" :class="item.class"></IconBtn>
          </a-popconfirm>
          <IconBtn v-else :icon="item.icon" :title="item.title" :class="item.class" @click="item.click"></IconBtn>
        </span>
        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item v-for="item in instanceOperations" :key="item.title" @click="item.click">
                <component :is="item.icon"></component>
                <span>&nbsp;{{ item.title }}</span>
              </a-menu-item>
            </a-menu>
          </template>
          <span>
            <IconBtn :icon="DownOutlined" :title="t('TXT_CODE_fe731dfc')"></IconBtn>
          </span>
        </a-dropdown>
      </div>
      <div class="buttons-section" v-else>
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
          <IconBtn :icon="DownOutlined" :title="t('TXT_CODE_fe731dfc')"></IconBtn>
        </a-dropdown>
      </div>
    </div>

    <!-- ROW 2: Console -->
    <div class="console-section">
      <TerminalCore
        v-if="instanceId && daemonId && hasConsoleAccess"
        :use-terminal-hook="terminalHook"
        :instance-id="instanceId"
        :daemon-id="daemonId"
        :height="card.height"
      />
      <div v-else-if="!hasConsoleAccess" class="access-denied">
        <CloseOutlined style="font-size: 48px; margin-bottom: 16px;" />
        <h3>Access Denied</h3>
        <p>You do not have permission to access the console for this instance.</p>
      </div>
    </div>
  </div>

  <!-- Sub-User Manager Modal -->
  <SubUserManager
    v-model:visible="subUserManagerVisible"
    :daemon-id="daemonId ?? ''"
    :instance-uuid="instanceId ?? ''"
  />
</template>


<style lang="scss" scoped>
// COMPACT 3-ROW LAYOUT
.compact-terminal-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 8px;
}

// ROW 1: TOP BAR - Header | Stats | Buttons
.top-bar {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.03) 0%, rgba(212, 107, 8, 0.03) 100%);
  border-radius: 12px;
  border: 1px solid rgba(153, 27, 27, 0.1);
}

// Header Section
.header-section {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.header-info {
  min-width: 0;
}

.instance-name {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

// Stats Section
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(153, 27, 27, 0.1);
}

.stats-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-color);
  opacity: 0.6;
}

.stats-items {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stats-placeholder {
  min-width: 120px;
  text-align: center;
}

.stats-offline {
  font-size: 12px;
  color: var(--text-color);
  opacity: 0.5;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;

  &:hover {
    background: rgba(153, 27, 27, 0.05);
  }
}

.stat-icon {
  font-size: 14px;
  color: rgba(153, 27, 27, 0.7);
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-color);
  opacity: 0.5;
}

.stat-value {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-color);

  &.value-error {
    color: var(--color-red-6);
  }

  &.value-warning {
    color: var(--color-orange-6);
  }
}

// Buttons Section
.buttons-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn-wrapper {
  display: inline-flex;
}

// Status Orb (smaller)
.status-orb {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-pulse {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.4), rgba(153, 27, 27, 0.1));
  filter: blur(4px);
  animation: orb-pulse 2s ease-in-out infinite;
}

.orb-ring {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.9), rgba(212, 107, 8, 0.7));
  box-shadow: 0 0 10px rgba(153, 27, 27, 0.5);
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

// ROW 2: Console Section
.console-section {
  flex: 1;
  min-height: 300px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--card-border-color);
}

.access-denied {
  padding: 40px;
  text-align: center;
  color: var(--color-red-5);
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
