<script setup lang="ts">
import InnerCard from "@/components/InnerCard.vue";
import PermissionBanner from "@/components/PermissionBanner.vue";
import ResponsiveLayoutGroup from "@/components/ResponsiveLayoutGroup.vue";
import { useAppRouters } from "@/hooks/useAppRouters";
import {
  TYPE_MINECRAFT_JAVA,
  TYPE_STEAM_SERVER_UNIVERSAL,
  useInstanceInfo
} from "@/hooks/useInstance";
import { useServerConfig } from "@/hooks/useServerConfig";
import { useUserPermissions } from "@/hooks/useUserPermissions";
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
const { hasInstanceAccess, userPermissions } = useUserPermissions();

const { getMetaOrRouteValue } = useLayoutCardTools(props.card);

// Get user's available management permissions
const availableManagerPermissions = computed(() => {
  if (isAdmin.value) return null; // Admins don't need permission notices
  const perms = userPermissions.value;
  const available = [];
  if (perms.canUploadFiles || perms.canDownloadFiles || perms.canDeleteFiles || perms.canModifyFiles) {
    available.push("File Manager");
  }
  if (perms.canAccessConsole) available.push("Console");
  if (hasInstanceAccess(instanceId ?? "")) available.push("Manage Settings");
  return available.length > 0 ? available : ["Limited Access"];
});

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
          serverConfigFiles.value?.length > 0 &&
          (isAdmin.value || userPermissions.value.canAccessConfigFiles)
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
      condition: () =>
        (state.settings.canFileManager || isAdmin.value) &&
        hasInstanceAccess(instanceId ?? "") &&
        (isAdmin.value || userPermissions.value.canAccessFileManager)
    },
    {
      title: t("TXT_CODE_40241d8e"),
      icon: UsergroupDeleteOutlined,
      click: () => {
        mcSettingsDialog.value?.openDialog();
      },
      condition: () =>
        (instanceInfo.value?.config.type.includes(TYPE_MINECRAFT_JAVA) ?? false) &&
        (isAdmin.value || userPermissions.value.canAccessMinecraftQuery)
    },
    {
      title: t("TXT_CODE_656a85d8"),
      icon: BuildOutlined,
      click: () => {
        rconSettingsDialog.value?.openDialog();
      },
      condition: () =>
        (instanceInfo.value?.config.type.includes(TYPE_STEAM_SERVER_UNIVERSAL) ?? false)
    },
    {
      title: t("TXT_CODE_d23631cb"),
      icon: CodeOutlined,
      click: () => {
        terminalConfigDialog.value?.openDialog();
      },
      condition: () => (isAdmin.value || userPermissions.value.canAccessTerminalSettings)
    },
    {
      title: t("TXT_CODE_b7d026f8"),
      icon: FieldTimeOutlined,
      condition: () =>
        !isGlobalTerminal.value &&
        (isAdmin.value || userPermissions.value.canAccessScheduledTasks),
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
      },
      condition: () => (isAdmin.value || userPermissions.value.canAccessEventTasks)
    },
    {
      title: t("TXT_CODE_4f34fc28"),
      icon: AppstoreAddOutlined,
      condition: () => isAdmin.value && userPermissions.value.canAccessInstanceSettings,
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
        state.settings.allowChangeCmd &&
        userPermissions.value.canAccessInstanceSettings,
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
      <div class="manager-buttons-grid" :class="{ 'centered-manager-grid': btns.length <= 3 }">
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

// Manager Permission Notice Banner
.manager-permission-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.08), rgba(212, 107, 8, 0.08));
  border: 2px solid rgba(153, 27, 27, 0.25);
  border-radius: 12px;
  margin-bottom: 16px;

  .manager-permission-icon {
    font-size: 22px;
    color: rgba(153, 27, 27, 0.9);
    flex-shrink: 0;
  }

  .manager-permission-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .manager-permission-label {
    font-size: 11px;
    font-weight: 700;
    color: rgba(153, 27, 27, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .manager-permission-list {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-gray-10);
  }
}

// MODERN MANAGER BUTTONS GRID
.manager-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  animation: grid-fade-in 0.5s ease-out;

  // Center buttons when there are 3 or fewer
  &.centered-manager-grid {
    justify-content: center;
    grid-template-columns: repeat(auto-fit, minmax(280px, 350px));
    max-width: 1200px;
    margin: 0 auto;
  }
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
  background: var(--theme-card-bg);
  border: 2px solid var(--theme-card-border);
  border-radius: 14px;
  text-align: left;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px var(--theme-shadow);
  animation: btn-entrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.1) 0%, rgba(255, 107, 53, 0.1) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-4px);
    border-color: var(--theme-card-border-hover);
    box-shadow: 0 8px 24px var(--theme-shadow-hover);
    background: var(--theme-card-bg-hover);

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
      color: var(--theme-title-color);
    }
  }

  &:active {
    transform: translateY(-2px);
    box-shadow: 0 4px 14px var(--theme-shadow);
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
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.2) 0%, rgba(255, 107, 53, 0.2) 100%);
  border-radius: 12px;
  border: 1.5px solid rgba(255, 140, 66, 0.5);
  transition: all 0.3s ease;
}

.btn-icon {
  font-size: 26px;
  color: var(--theme-card-border-hover);
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
  color: var(--theme-title-color);
  letter-spacing: -0.2px;
  line-height: 1.3;
  transition: color 0.3s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--theme-subtitle-color);
  letter-spacing: 0.2px;
}

// BUTTON ARROW
.btn-arrow {
  font-size: 16px;
  color: var(--theme-card-border-hover);
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
