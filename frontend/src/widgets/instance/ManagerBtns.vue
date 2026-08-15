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
  ShopOutlined,
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
import { openMarketDialog } from "@/components/fc";
import { INSTANCE_STATUS_CODE } from "@/types/const";
import FileManager from "./FileManager.vue";
import ServerConfigOverview from "./ServerConfigOverview.vue";
import Schedule from "./Schedule.vue";

const fileManagerVisible = ref(false);
const serverConfigVisible = ref(false);
const scheduleVisible = ref(false);

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
  merged?: boolean;
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
        serverConfigVisible.value = true;
      }
    },
    {
      title: t("TXT_CODE_ae533703"),
      icon: FolderOpenOutlined,
      click: () => {
        fileManagerVisible.value = true;
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
        scheduleVisible.value = true;
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
    },
    {
      title: "Remake Your Server!",
      icon: ShopOutlined,
      click: async () => {
        try {
          await openMarketDialog(daemonId ?? "", instanceId ?? "", {
            autoInstall: true
          });
        } catch (error) {
          // User cancelled - ignore
        }
      },
      condition: () =>
        !isGlobalTerminal.value &&
        instanceInfo.value?.status === INSTANCE_STATUS_CODE.STOPPED &&
        (isAdmin.value || userPermissions.value.canAccessServerMarket)
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
  <template v-if="props.merged">
    <template v-for="item in btns" :key="item.title">
      <a-button
        v-if="item.condition()"
        size="large"
        class="action-btn"
        @click="item.click"
      >
        <template #icon>
          <component :is="item.icon" />
        </template>
        {{ item.title }}
      </a-button>
    </template>
  </template>

  <a-modal v-model:open="fileManagerVisible" :footer="null" :title="t('TXT_CODE_ae533703')" width="95%" wrapClassName="full-modal">
    <FileManager :card="props.card" v-if="fileManagerVisible" />
  </a-modal>

  <a-modal v-model:open="serverConfigVisible" :footer="null" :title="t('TXT_CODE_d07742fe')" width="95%" wrapClassName="full-modal">
    <ServerConfigOverview :card="props.card" v-if="serverConfigVisible" />
  </a-modal>

  <a-modal v-model:open="scheduleVisible" :footer="null" :title="t('TXT_CODE_b7d026f8')" width="95%" wrapClassName="full-modal">
    <Schedule :card="props.card" v-if="scheduleVisible" />
  </a-modal>

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
  background: radial-gradient(circle, var(--theme-card-bg-hover), transparent 70%);
  filter: blur(20px);
  pointer-events: none;
}

.header-icon-modern {
  font-size: 22px;
  color: var(--theme-title-color);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-text-gradient {
  font-weight: 700;
  background: none;
  color: var(--theme-title-color);
  font-size: 16px;
  letter-spacing: -0.3px;
}

// Manager Permission Notice Banner
.manager-permission-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: var(--theme-card-bg-hover);
  border: 2px solid var(--theme-card-border);
  border-radius: 12px;
  margin-bottom: 16px;

  .manager-permission-icon {
    font-size: 22px;
    color: var(--theme-title-color);
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
    color: var(--theme-title-color);
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
// MODERN MANAGER BUTTONS GRID
.manager-buttons-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  animation: grid-fade-in 0.5s ease-out;

  // Center buttons when there are 3 or fewer
  &.centered-manager-grid {
    justify-content: center;
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
  justify-content: flex-start !important;
  gap: 0 !important;
  width: 72px !important;
  height: 72px !important;
  min-height: 72px !important;
  padding: 8px !important;
  background: var(--theme-card-bg) !important;
  border: 2px solid var(--theme-card-border) !important;
  border-radius: 36px !important;
  text-align: left;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  box-shadow: 0 4px 12px var(--theme-shadow) !important;
  animation: btn-entrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: transparent;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    width: 280px !important;
    border-radius: 14px !important;
    padding: 8px 16px 8px 8px !important;
    gap: 14px !important;
    transform: translateY(-4px) !important;
    border-color: var(--theme-card-border-hover) !important;
    box-shadow: 0 8px 24px var(--theme-shadow-hover) !important;
    background: var(--theme-card-bg-hover) !important;

    &::before {
      opacity: 1;
    }

    .btn-icon-wrapper {
      border-radius: 12px;
    }

    .btn-icon {
      transform: scale(1.12) rotate(-5deg);
    }

    .btn-content {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
      transition-delay: 0.1s;
    }

    .btn-arrow {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
      transition-delay: 0.15s;
    }

    .btn-title {
      color: var(--theme-title-color);
    }
  }

  &:active {
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 14px var(--theme-shadow) !important;
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
  background: var(--theme-card-bg);
  border-radius: 50%;
  border: 1.5px solid var(--theme-card-border);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-icon {
  font-size: 24px;
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
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
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
  opacity: 0;
  visibility: hidden;
  transform: translateX(-10px);
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
}

// RESPONSIVE
@media (max-width: 992px) {
  .manager-buttons-grid {
    justify-content: flex-start;
  }

  .manager-modern-btn {
    width: 60px !important;
    height: 60px !important;
    min-height: 60px !important;
    padding: 6px !important;

    &:hover {
      width: 240px !important;
    }
  }

  .btn-icon-wrapper {
    width: 44px;
    height: 44px;
  }

  .btn-icon {
    font-size: 20px;
  }

  .btn-title {
    font-size: 14px;
  }
}

@media (max-width: 576px) {
  .manager-buttons-grid {
    justify-content: center;
  }

  .manager-modern-btn {
    width: 54px !important;
    height: 54px !important;
    min-height: 54px !important;
    padding: 5px !important;

    &:hover {
      width: 100% !important;
    }
  }

  .btn-icon-wrapper {
    width: 40px;
    height: 40px;
  }

  .btn-icon {
    font-size: 18px;
  }

  .btn-title {
    font-size: 14px;
  }

  .btn-subtitle {
    font-size: 11px;
  }
}
</style>
