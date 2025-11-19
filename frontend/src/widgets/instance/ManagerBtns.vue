<script setup lang="ts">
import InnerCard from "@/components/InnerCard.vue";
import ResponsiveLayoutGroup from "@/components/ResponsiveLayoutGroup.vue";
import { useAppRouters } from "@/hooks/useAppRouters";
import {
  TYPE_MINECRAFT_JAVA,
  TYPE_STEAM_SERVER_UNIVERSAL,
  useInstanceInfo
} from "@/hooks/useInstance";
import { useServerConfig } from "@/hooks/useServerConfig";
import { t } from "@/lang/i18n";
import { useAppStateStore } from "@/stores/useAppStateStore";
import type { LayoutCard } from "@/types";
import {
  AppstoreAddOutlined,
  ArrowRightOutlined,
  BuildOutlined,
  CodeOutlined,
  ControlOutlined,
  DashboardOutlined,
  FieldTimeOutlined,
  FolderOpenOutlined,
  UsergroupDeleteOutlined
} from "@ant-design/icons-vue";

import { computed, ref, watch } from "vue";
import type { RouteLocationPathRaw } from "vue-router";
import { LayoutCardHeight } from "../../config/originLayoutConfig";
import { useLayoutCardTools } from "../../hooks/useCardTools";
import { arrayFilter } from "../../tools/array";
import EventConfig from "./dialogs/EventConfig.vue";
import InstanceDetail from "./dialogs/InstanceDetail.vue";
import InstanceFundamentalDetail from "./dialogs/InstanceFundamentalDetail.vue";
import McPingSettings from "./dialogs/McPingSettings.vue";
import PingConfig from "./dialogs/PingConfig.vue";
import RconSettings from "./dialogs/RconSettings.vue";
import TermConfig from "./dialogs/TermConfig.vue";

const terminalConfigDialog = ref<InstanceType<typeof TermConfig>>();
const rconSettingsDialog = ref<InstanceType<typeof RconSettings>>();
const mcSettingsDialog = ref<InstanceType<typeof McPingSettings>>();
const eventConfigDialog = ref<InstanceType<typeof EventConfig>>();
const pingConfigDialog = ref<InstanceType<typeof PingConfig>>();
const instanceDetailsDialog = ref<InstanceType<typeof InstanceDetail>>();
const instanceFundamentalDetailDialog = ref<InstanceType<typeof InstanceFundamentalDetail>>();

const { toPage: toOtherPager } = useAppRouters();

const props = defineProps<{
  card: LayoutCard;
}>();

const { isAdmin, state } = useAppStateStore();

const { getMetaOrRouteValue } = useLayoutCardTools(props.card);

const instanceId = getMetaOrRouteValue("instanceId");
const daemonId = getMetaOrRouteValue("daemonId");

const { instanceInfo, execute, isGlobalTerminal } = useInstanceInfo({
  instanceId,
  daemonId,
  autoRefresh: true
});

const { serverConfigFiles, refresh: refreshServerConfig } = useServerConfig();

const toPage = (params: RouteLocationPathRaw) => {
  if (!params.query) params.query = {};
  params.query = {
    ...params.query,
    instanceId,
    daemonId
  };
  toOtherPager(params);
};

const refreshInstanceInfo = async () => {
  await execute({
    params: {
      uuid: instanceId ?? "",
      daemonId: daemonId ?? ""
    },
    forceRequest: true
  });
};

const btns = computed(() => {
  if (!instanceInfo.value) return [];
  return arrayFilter([
    {
      title: t("TXT_CODE_d07742fe"),
      icon: ControlOutlined,
      condition: () => {
        return (
          !isGlobalTerminal.value &&
          !!serverConfigFiles.value &&
          serverConfigFiles.value?.length > 0
        );
      },
      click: (): void => {
        toPage({
          path: "/instances/terminal/serverConfig",
          query: {
            type: instanceInfo.value?.config.type
          }
        });
      }
    },
    {
      title: t("TXT_CODE_ae533703"),
      icon: FolderOpenOutlined,
      click: () => {
        toPage({ path: "/instances/terminal/files" });
      },
      condition: () => state.settings.canFileManager || isAdmin.value
    },
    {
      title: t("TXT_CODE_40241d8e"),
      icon: UsergroupDeleteOutlined,
      click: () => {
        mcSettingsDialog.value?.openDialog();
      },
      condition: () => instanceInfo.value?.config.type.includes(TYPE_MINECRAFT_JAVA) ?? false
    },
    {
      title: t("TXT_CODE_656a85d8"),
      icon: BuildOutlined,
      click: () => {
        rconSettingsDialog.value?.openDialog();
      },
      condition: () =>
        instanceInfo.value?.config.type.includes(TYPE_STEAM_SERVER_UNIVERSAL) ?? false
    },
    {
      title: t("TXT_CODE_d23631cb"),
      icon: CodeOutlined,
      click: () => {
        terminalConfigDialog.value?.openDialog();
      }
    },
    {
      title: t("TXT_CODE_b7d026f8"),
      icon: FieldTimeOutlined,
      condition: () => !isGlobalTerminal.value,
      click: () => {
        toPage({
          path: "/instances/schedule",
          query: {
            instanceId,
            daemonId
          }
        });
      }
    },
    {
      title: t("TXT_CODE_d341127b"),
      icon: DashboardOutlined,
      click: () => {
        eventConfigDialog.value?.openDialog();
      }
    },
    {
      title: t("TXT_CODE_4f34fc28"),
      icon: AppstoreAddOutlined,
      condition: () => isAdmin.value,
      click: () => {
        instanceDetailsDialog.value?.openDialog();
      }
    },
    {
      title: t("TXT_CODE_4f34fc28"),
      icon: AppstoreAddOutlined,
      condition: () =>
        !isAdmin.value &&
        instanceInfo.value?.config.processType === "docker" &&
        state.settings.allowChangeCmd,
      click: () => {
        instanceFundamentalDetailDialog.value?.openDialog();
      }
    }
  ]);
});

watch(instanceInfo, (cfg, oldCfg) => {
  if (cfg?.config?.type && instanceId && daemonId && cfg.config.type !== oldCfg?.config?.type) {
    refreshServerConfig(cfg.config.type, instanceId, daemonId);
  }
});
</script>

<template>
  <CardPanel class="containerWrapper ultra-widget-panel" style="height: 100%">
    <template #title>
      <div class="widget-header">
        <div class="header-glow"></div>
        <ControlOutlined class="header-icon-modern" />
        <span class="header-text-gradient">{{ card.title }}</span>
      </div>
    </template>
    <template #body>
      <div class="widgets-masonry-grid">
        <div
          v-for="(item, index) in btns"
          :key="item.title"
          class="widget-card"
          :class="`widget-${index % 3}`"
          @click="item.click"
          :style="{ animationDelay: `${index * 0.05}s` }"
        >
          <div class="widget-ambient-glow"></div>
          <div class="widget-shine"></div>
          <div class="widget-icon-bubble">
            <div class="bubble-orb"></div>
            <component :is="item.icon" class="widget-icon" />
          </div>
          <div class="widget-info">
            <h4 class="widget-title">{{ item.title }}</h4>
            <div class="widget-cta">
              <span class="cta-text">{{ t("TXT_CODE_6c5985ca") }}</span>
              <div class="cta-arrow-wrapper">
                <ArrowRightOutlined class="cta-arrow" />
                <ArrowRightOutlined class="cta-arrow cta-arrow-ghost" />
              </div>
            </div>
          </div>
          <div class="widget-corner-accent"></div>
        </div>
      </div>
    </template>
  </CardPanel>

  <TermConfig
    ref="terminalConfigDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />

  <EventConfig
    ref="eventConfigDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />

  <PingConfig
    ref="pingConfigDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />

  <InstanceDetail
    ref="instanceDetailsDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />

  <InstanceFundamentalDetail
    ref="instanceFundamentalDetailDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />

  <RconSettings
    ref="rconSettingsDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />

  <McPingSettings
    ref="mcSettingsDialog"
    :instance-info="instanceInfo"
    :instance-id="instanceId"
    :daemon-id="daemonId"
    @update="refreshInstanceInfo"
  />
</template>

<style lang="scss" scoped>
// ULTRA MODERN WIDGET DASHBOARD
.ultra-widget-panel {
  :deep(.card-panel-content) {
    overflow-y: auto;
    padding: 8px;
  }
}

// GRADIENT HEADER
.widget-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.header-glow {
  position: absolute;
  left: 0;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.3), transparent 70%);
  filter: blur(20px);
  pointer-events: none;
}

.header-icon-modern {
  font-size: 22px;
  color: rgba(153, 27, 27, 0.9);
  filter: drop-shadow(0 2px 4px rgba(153, 27, 27, 0.2));
}

.header-text-gradient {
  font-weight: 700;
  background: linear-gradient(135deg, rgba(153, 27, 27, 1) 0%, rgba(212, 107, 8, 1) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 16px;
  letter-spacing: -0.3px;
}

// MASONRY WIDGET GRID
.widgets-masonry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  animation: grid-fade-in 0.6s ease-out;
}

@keyframes grid-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

// WIDGET CARDS - Unique for each
.widget-card {
  position: relative;
  padding: 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(153, 27, 27, 0.15);
  border-radius: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
    0 4px 20px rgba(153, 27, 27, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: widget-entrance 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow:
      0 16px 40px rgba(153, 27, 27, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
    border-color: rgba(153, 27, 27, 0.3);

    .widget-ambient-glow {
      opacity: 0.8;
      transform: scale(1.5);
    }

    .widget-shine {
      transform: translateX(200%);
    }

    .bubble-orb {
      transform: scale(1.4);
      opacity: 0.6;
    }

    .widget-icon {
      transform: scale(1.15) rotate(8deg);
    }

    .cta-arrow {
      transform: translateX(4px);
    }

    .cta-arrow-ghost {
      opacity: 1;
      transform: translateX(8px);
    }

    .widget-corner-accent {
      width: 80px;
      height: 80px;
      opacity: 0.4;
    }
  }

  &:active {
    transform: translateY(-4px) scale(0.98);
  }
}

@keyframes widget-entrance {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// VARIANT STYLES
.widget-0 {
  background: rgba(255, 255, 255, 0.65);
  .widget-ambient-glow {
    background: radial-gradient(circle, rgba(153, 27, 27, 0.4), transparent 70%);
  }
}

.widget-1 {
  background: rgba(255, 250, 245, 0.7);
  .widget-ambient-glow {
    background: radial-gradient(circle, rgba(212, 107, 8, 0.4), transparent 70%);
  }
}

.widget-2 {
  background: rgba(255, 245, 240, 0.65);
  .widget-ambient-glow {
    background: radial-gradient(circle, rgba(180, 67, 67, 0.4), transparent 70%);
  }
}

// AMBIENT GLOW EFFECT
.widget-ambient-glow {
  position: absolute;
  top: -40%;
  right: -40%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(153, 27, 27, 0.3), transparent 70%);
  filter: blur(40px);
  opacity: 0;
  transition: all 0.6s ease;
  pointer-events: none;
}

// SHINE EFFECT
.widget-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 40%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transform: skewX(-20deg);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

// ICON BUBBLE
.widget-icon-bubble {
  position: relative;
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.bubble-orb {
  position: absolute;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.15) 0%, rgba(212, 107, 8, 0.15) 100%);
  filter: blur(12px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.widget-icon {
  position: relative;
  z-index: 1;
  font-size: 36px;
  color: rgba(153, 27, 27, 0.85);
  filter: drop-shadow(0 4px 8px rgba(153, 27, 27, 0.2));
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

// WIDGET INFO
.widget-info {
  position: relative;
  z-index: 1;
}

.widget-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-color);
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.widget-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.cta-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.7;
}

.cta-arrow-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
}

.cta-arrow {
  position: absolute;
  font-size: 14px;
  color: rgba(153, 27, 27, 0.8);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.cta-arrow-ghost {
  opacity: 0;
  transform: translateX(0);
}

// CORNER ACCENT
.widget-corner-accent {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, transparent 50%, rgba(153, 27, 27, 0.08) 50%);
  border-radius: 20px 0 20px 0;
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

// RESPONSIVE
@media (max-width: 992px) {
  .widgets-masonry-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .widgets-masonry-grid {
    grid-template-columns: 1fr;
  }

  .widget-card {
    padding: 20px;
  }

  .widget-icon-bubble {
    width: 56px;
    height: 56px;
  }

  .bubble-orb {
    width: 56px;
    height: 56px;
  }

  .widget-icon {
    font-size: 28px;
  }
}
</style>
