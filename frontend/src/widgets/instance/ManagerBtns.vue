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
      <div class="manager-buttons-grid">
        <a-button
          v-for="(item, index) in btns"
          :key="item.title"
          size="large"
          class="manager-modern-btn"
          @click="item.click"
          :style="{ animationDelay: `${index * 0.04}s` }"
        >
          <div class="btn-icon-wrapper">
            <component :is="item.icon" class="btn-icon" />
          </div>
          <div class="btn-content">
            <span class="btn-title">{{ item.title }}</span>
            <span class="btn-subtitle">{{ t("TXT_CODE_6c5985ca") }}</span>
          </div>
          <ArrowRightOutlined class="btn-arrow" />
        </a-button>
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

// MODERN MANAGER BUTTONS GRID
.manager-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  animation: grid-fade-in 0.5s ease-out;
}

@keyframes grid-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

// MODERN MANAGER BUTTON
.manager-modern-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  height: auto;
  min-height: 72px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 250, 245, 0.95) 100%);
  border: 2px solid rgba(153, 27, 27, 0.15);
  border-radius: 14px;
  text-align: left;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 3px 10px rgba(153, 27, 27, 0.08);
  animation: btn-entrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(153, 27, 27, 0.05) 0%, rgba(212, 107, 8, 0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-5px);
    border-color: rgba(153, 27, 27, 0.3);
    box-shadow: 0 8px 20px rgba(153, 27, 27, 0.15);

    &::before {
      opacity: 1;
    }

    .btn-icon {
      transform: scale(1.12) rotate(-5deg);
    }

    .btn-arrow {
      transform: translateX(6px);
    }

    .btn-title {
      color: rgba(153, 27, 27, 1);
    }
  }

  &:active {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(153, 27, 27, 0.1);
  }
}

@keyframes btn-entrance {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// BUTTON ICON WRAPPER
.btn-icon-wrapper {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.1) 0%, rgba(212, 107, 8, 0.1) 100%);
  border-radius: 12px;
  border: 1.5px solid rgba(153, 27, 27, 0.2);
  transition: all 0.3s ease;
}

.btn-icon {
  font-size: 26px;
  color: rgba(153, 27, 27, 0.85);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// BUTTON CONTENT
.btn-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.btn-title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(153, 27, 27, 0.9);
  letter-spacing: -0.2px;
  line-height: 1.3;
  transition: color 0.3s ease;
}

.btn-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: rgba(153, 27, 27, 0.5);
  letter-spacing: 0.2px;
}

// BUTTON ARROW
.btn-arrow {
  font-size: 16px;
  color: rgba(153, 27, 27, 0.6);
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// RESPONSIVE
@media (max-width: 992px) {
  .manager-buttons-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .manager-modern-btn {
    min-height: 68px;
    padding: 14px 16px;
  }

  .btn-icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .btn-icon {
    font-size: 24px;
  }

  .btn-title {
    font-size: 14px;
  }
}

@media (max-width: 576px) {
  .manager-buttons-grid {
    grid-template-columns: 1fr;
  }

  .manager-modern-btn {
    min-height: 64px;
    padding: 14px 16px;
  }

  .btn-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .btn-icon {
    font-size: 22px;
  }

  .btn-title {
    font-size: 14px;
  }

  .btn-subtitle {
    font-size: 11px;
  }
}
</style>
