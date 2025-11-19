<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { openMarketDialog, openRenewalDialog } from "@/components/fc";
import IconBtn from "@/components/IconBtn.vue";
import TerminalCore from "@/components/TerminalCore.vue";
import TerminalTags from "@/components/TerminalTags.vue";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { INSTANCE_TYPE_TRANSLATION, verifyEULA } from "@/hooks/useInstance";
import { useScreen } from "@/hooks/useScreen";
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
  CheckCircleOutlined,
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
  RedoOutlined
} from "@ant-design/icons-vue";
import { useLocalStorage } from "@vueuse/core";
import prettyBytes, { type Options as PrettyOptions } from "pretty-bytes";
import { computed } from "vue";
import type { TagInfo } from "../../components/interface";
import { GLOBAL_INSTANCE_NAME } from "../../config/const";
import { useTerminal, type UseTerminalHook } from "../../hooks/useTerminal";
import { arrayFilter } from "../../tools/array";

const props = defineProps<{
  card: LayoutCard;
}>();

const { isPhone } = useScreen();
const { state, isAdmin } = useAppStateStore();
const { getMetaOrRouteValue } = useLayoutCardTools(props.card);

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
  <!-- ULTRA MODERN BENTO GRID + GLASSMORPHISM REDESIGN -->
  <div v-if="innerTerminalType" class="bento-terminal-container">
    <!-- Hero Section with Floating Status -->
    <div class="hero-section">
      <div class="status-orb" :class="{ 'orb-running': isRunning, 'orb-busy': isBuys, 'orb-stopped': isStopped }">
        <div class="orb-pulse"></div>
        <div class="orb-ring"></div>
      </div>
      <div class="hero-content">
        <h1 class="instance-hero-title">{{ getInstanceName }}</h1>
        <div class="hero-meta-chips">
          <div class="meta-chip chip-status" :class="{ 'chip-active': isRunning, 'chip-busy': isBuys }">
            <div class="chip-dot"></div>
            <span>{{ instanceStatusText }}</span>
          </div>
          <div v-if="instanceTypeText" class="meta-chip chip-type">
            <CloudServerOutlined />
            <span>{{ instanceTypeText }}</span>
          </div>
          <div v-if="instanceInfo?.watcher && instanceInfo?.watcher > 1" class="meta-chip chip-watchers">
            <LaptopOutlined />
            <span>{{ instanceInfo?.watcher }} watching</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bento Grid Layout -->
    <div class="bento-grid">
      <!-- Stats Cards in Bento Style -->
      <div class="bento-stats-container" v-if="!isStopped">
        <div v-for="(tag, index) in terminalTopTags" :key="tag.label"
             class="bento-stat-card"
             :class="`bento-stat-${index}`"
        >
          <div class="stat-glow" :class="`glow-${tag.color}`"></div>
          <component :is="tag.icon" class="bento-stat-icon" />
          <div class="bento-stat-info">
            <div class="bento-stat-label">{{ tag.label }}</div>
            <div class="bento-stat-value" :class="`value-${tag.color}`">{{ tag.value }}</div>
          </div>
        </div>
      </div>

      <!-- Floating Action Bubbles (Glassmorphism) -->
      <div class="glass-actions-panel" v-if="!isPhone">
        <div class="actions-grid-modern">
          <template v-for="item in quickOperations" :key="item.title">
            <div
              v-if="item.noConfirm"
              class="glass-bubble bubble-primary"
              :class="{ 'bubble-disabled': isOpenInstanceLoading }"
              @click="!isOpenInstanceLoading && item.click()"
            >
              <div class="bubble-glow"></div>
              <div class="bubble-content">
                <component :is="item.icon" class="bubble-icon" />
                <span class="bubble-text">{{ item.title }}</span>
              </div>
            </div>
            <a-popconfirm v-else :title="t('TXT_CODE_276756b2')" @confirm="item.click">
              <div class="glass-bubble bubble-primary">
                <div class="bubble-glow"></div>
                <div class="bubble-content">
                  <component :is="item.icon" class="bubble-icon" />
                  <span class="bubble-text">{{ item.title }}</span>
                </div>
              </div>
            </a-popconfirm>
          </template>

          <template v-for="item in instanceOperations" :key="item.title">
            <div
              v-if="item.noConfirm"
              class="glass-bubble"
              :class="item.type === 'danger' ? 'bubble-danger' : ''"
              @click="item.click"
            >
              <div class="bubble-glow"></div>
              <div class="bubble-content">
                <component :is="item.icon" class="bubble-icon" />
                <span class="bubble-text">{{ item.title }}</span>
              </div>
            </div>
            <a-popconfirm v-else :title="t('TXT_CODE_276756b2')" @confirm="item.click">
              <div class="glass-bubble" :class="item.type === 'danger' ? 'bubble-danger' : ''">
                <div class="bubble-glow"></div>
                <div class="bubble-content">
                  <component :is="item.icon" class="bubble-icon" />
                  <span class="bubble-text">{{ item.title }}</span>
                </div>
              </div>
            </a-popconfirm>
          </template>
        </div>
      </div>

      <!-- Mobile Actions -->
      <div class="mobile-glass-actions" v-else>
        <a-dropdown>
          <template #overlay>
            <a-menu class="glass-menu">
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
          <div class="glass-bubble bubble-primary bubble-mobile">
            <div class="bubble-glow"></div>
            <div class="bubble-content">
              <span>{{ t("TXT_CODE_fe731dfc") }}</span>
              <DownOutlined />
            </div>
          </div>
        </a-dropdown>
      </div>
    </div>

    <!-- Terminal in Modern Glass Container -->
    <div class="glass-terminal-wrapper">
      <div class="terminal-glass-header">
        <div class="terminal-dots">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
        </div>
        <span class="terminal-title">Terminal</span>
      </div>
      <TerminalCore
        v-if="instanceId && daemonId"
        :use-terminal-hook="terminalHook"
        :instance-id="instanceId"
        :daemon-id="daemonId"
        :height="card.height"
      />
    </div>
  </div>

  <!-- Other Page View -->
  <CardPanel v-else class="containerWrapper" style="height: 100%">
    <template #title>
      <CloudServerOutlined />
      <span class="ml-8"> {{ getInstanceName }} </span>
      <span class="ml-8">
        <a-tag v-if="isRunning" color="green">
          <CheckCircleOutlined />
          {{ instanceStatusText }}
        </a-tag>
        <a-tag v-else-if="isBuys" color="red">
          <LoadingOutlined />
          {{ instanceStatusText }}
        </a-tag>
        <a-tag v-else>
          <InfoCircleOutlined />
          {{ instanceStatusText }}
        </a-tag>
        <a-tag color="purple"> {{ instanceTypeText }} </a-tag>
      </span>
    </template>
    <template #operator>
      <span
        v-for="item in quickOperations"
        :key="item.title"
        size="default"
        class="mr-2"
        v-bind="item.props"
      >
        <IconBtn :icon="item.icon" :title="item.title" @click="item.click"></IconBtn>
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
        <span size="default" type="primary">
          <IconBtn :icon="DownOutlined" :title="t('TXT_CODE_fe731dfc')"></IconBtn>
        </span>
      </a-dropdown>
    </template>
    <template #body>
      <div class="mb-6">
        <TerminalTags :tags="terminalTopTags" />
      </div>
      <TerminalCore
        v-if="instanceId && daemonId"
        :use-terminal-hook="terminalHook"
        :instance-id="instanceId"
        :daemon-id="daemonId"
        :height="card.height"
      />
    </template>
  </CardPanel>
</template>


<style lang="scss" scoped>
// ULTRA MODERN BENTO GRID + GLASSMORPHISM DESIGN
.bento-terminal-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  padding: 8px;
}

// HERO SECTION WITH ANIMATED STATUS ORB
.hero-section {
  position: relative;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px 28px;
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.03) 0%, rgba(212, 107, 8, 0.03) 100%);
  border-radius: 20px;
  border: 1px solid rgba(153, 27, 27, 0.1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(153, 27, 27, 0.08), transparent 70%);
    pointer-events: none;
  }
}

// STATUS ORB - Cyberpunk Style Animated Indicator
.status-orb {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb-pulse {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.4), rgba(153, 27, 27, 0.1));
  filter: blur(8px);
  animation: orb-pulse 2s ease-in-out infinite;
}

.orb-ring {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.9), rgba(212, 107, 8, 0.7));
  box-shadow: 
    0 0 20px rgba(153, 27, 27, 0.5),
    inset 0 0 10px rgba(255, 255, 255, 0.2);
}

.orb-running {
  .orb-pulse {
    background: radial-gradient(circle, rgba(82, 196, 26, 0.5), rgba(82, 196, 26, 0.1));
    animation: orb-pulse-green 1.5s ease-in-out infinite;
  }
  .orb-ring {
    background: radial-gradient(circle, #52c41a, #73d13d);
    box-shadow: 
      0 0 30px rgba(82, 196, 26, 0.7),
      inset 0 0 15px rgba(255, 255, 255, 0.3);
  }
}

.orb-busy {
  .orb-pulse {
    background: radial-gradient(circle, rgba(255, 193, 7, 0.5), rgba(255, 193, 7, 0.1));
    animation: orb-pulse-yellow 1s ease-in-out infinite;
  }
  .orb-ring {
    background: radial-gradient(circle, #ffc107, #ffeb3b);
    box-shadow: 
      0 0 30px rgba(255, 193, 7, 0.7),
      inset 0 0 15px rgba(255, 255, 255, 0.3);
  }
}

.orb-stopped {
  .orb-pulse {
    animation: none;
    opacity: 0.3;
  }
  .orb-ring {
    background: radial-gradient(circle, #666, #888);
    box-shadow: 
      0 0 10px rgba(100, 100, 100, 0.3),
      inset 0 0 5px rgba(255, 255, 255, 0.1);
  }
}

@keyframes orb-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.3); opacity: 0.3; }
}

@keyframes orb-pulse-green {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.4); opacity: 0.3; }
}

@keyframes orb-pulse-yellow {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 0.4; }
}

// HERO CONTENT
.hero-content {
  flex: 1;
  min-width: 0;
}

.instance-hero-title {
  margin: 0 0 12px 0;
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, rgba(153, 27, 27, 1) 0%, rgba(212, 107, 8, 1) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
}

.hero-meta-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(153, 27, 27, 0.2);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.chip-status {
  position: relative;
}

.chip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(153, 27, 27, 0.6);
}

.chip-active .chip-dot {
  background: #52c41a;
  box-shadow: 0 0 10px rgba(82, 196, 26, 0.6);
  animation: dot-pulse 2s ease-in-out infinite;
}

.chip-busy .chip-dot {
  background: #ffc107;
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.6);
  animation: dot-pulse 1s ease-in-out infinite;
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

// BENTO GRID LAYOUT
.bento-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

// BENTO STATS CARDS
.bento-stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.bento-stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(153, 27, 27, 0.15);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 
      0 8px 24px rgba(153, 27, 27, 0.15),
      0 0 0 1px rgba(153, 27, 27, 0.1);
    
    .bento-stat-icon {
      transform: scale(1.1) rotate(-5deg);
    }
  }
}

.stat-glow {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.15;
  pointer-events: none;
}

.glow-error {
  background: radial-gradient(circle, var(--color-red-5), transparent);
}

.glow-warning {
  background: radial-gradient(circle, var(--color-orange-5), transparent);
}

.glow-default {
  background: radial-gradient(circle, rgba(153, 27, 27, 0.8), transparent);
}

.bento-stat-icon {
  font-size: 32px;
  color: rgba(153, 27, 27, 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.bento-stat-info {
  flex: 1;
}

.bento-stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-color);
  opacity: 0.5;
  margin-bottom: 4px;
}

.bento-stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-color);
  line-height: 1;

  &.value-error {
    color: var(--color-red-6);
    text-shadow: 0 0 10px rgba(255, 77, 79, 0.3);
  }

  &.value-warning {
    color: var(--color-orange-6);
    text-shadow: 0 0 10px rgba(250, 173, 20, 0.3);
  }
}

// GLASSMORPHISM ACTION BUBBLES
.glass-actions-panel {
  grid-column: 2;
  grid-row: 1 / 3;
}

.actions-grid-modern {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.glass-bubble {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 18px;
  padding: 16px 20px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 16px rgba(153, 27, 27, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.05));
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateX(-6px) scale(1.03);
    box-shadow: 
      0 12px 32px rgba(153, 27, 27, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
    border-color: rgba(153, 27, 27, 0.4);

    &::before {
      opacity: 1;
    }

    .bubble-icon {
      transform: scale(1.2) rotate(5deg);
    }

    .bubble-glow {
      opacity: 0.8;
    }
  }

  &:active {
    transform: translateX(-3px) scale(0.98);
  }
}

.bubble-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.4), transparent 70%);
  filter: blur(20px);
  transform: translate(-50%, -50%);
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.bubble-primary {
  background: rgba(82, 196, 26, 0.15);
  border-color: rgba(82, 196, 26, 0.3);

  .bubble-icon {
    color: var(--color-green-7);
  }

  .bubble-glow {
    background: radial-gradient(circle, rgba(82, 196, 26, 0.5), transparent 70%);
  }

  &:hover {
    background: rgba(82, 196, 26, 0.25);
    border-color: var(--color-green-6);
  }
}

.bubble-danger {
  &:hover {
    border-color: var(--color-red-5);
    
    .bubble-icon {
      color: var(--color-red-6);
    }
  }
}

.bubble-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.bubble-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.bubble-icon {
  font-size: 24px;
  color: rgba(153, 27, 27, 0.8);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.bubble-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-color);
  white-space: nowrap;
}

.bubble-mobile {
  width: 100%;
  justify-content: center;
  margin-top: 16px;
}

// GLASS TERMINAL WRAPPER - macOS Style
.glass-terminal-wrapper {
  grid-column: 1 / -1;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(40px) saturate(150%);
  -webkit-backdrop-filter: blur(40px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.terminal-glass-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(40, 40, 40, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
  
  &.dot-red {
    background: linear-gradient(135deg, #ff5f57, #ff3b30);
  }
  
  &.dot-yellow {
    background: linear-gradient(135deg, #ffbd2e, #ff9500);
  }
  
  &.dot-green {
    background: linear-gradient(135deg, #28c840, #30d158);
  }
}

.terminal-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.3px;
}

// MOBILE OPTIMIZATIONS
@media (max-width: 992px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }

  .glass-actions-panel {
    grid-column: 1;
    grid-row: auto;
  }

  .actions-grid-modern {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .instance-hero-title {
    font-size: 24px;
  }

  .hero-section {
    padding: 24px 20px;
  }

  .status-orb {
    width: 56px;
    height: 56px;
  }

  .orb-ring,
  .orb-pulse {
    width: 40px;
    height: 40px;
  }
}

@media (max-width: 576px) {
  .bento-stats-container {
    grid-template-columns: 1fr;
  }

  .actions-grid-modern {
    grid-template-columns: 1fr;
  }

  .instance-hero-title {
    font-size: 20px;
  }

  .bento-terminal-container {
    padding: 4px;
    gap: 16px;
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
