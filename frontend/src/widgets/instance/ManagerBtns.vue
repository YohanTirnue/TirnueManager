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
  <CardPanel class="containerWrapper modern-manager-panel" style="height: 100%">
    <template #title>
      <div class="panel-header">
        <ControlOutlined class="header-icon" />
        <span>{{ card.title }}</span>
      </div>
    </template>
    <template #body>
      <div class="modern-function-grid">
        <div
          v-for="item in btns"
          :key="item.title"
          class="function-card"
          @click="item.click"
        >
          <div class="function-icon-wrapper">
            <component :is="item.icon" class="function-icon" />
          </div>
          <div class="function-content">
            <h4 class="function-title">{{ item.title }}</h4>
            <p class="function-action">
              {{ t("TXT_CODE_6c5985ca") }}
              <ArrowRightOutlined class="arrow-icon" />
            </p>
          </div>
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
.modern-manager-panel {
  :deep(.card-panel-content) {
    overflow-y: auto;
  }
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 10px;

  .header-icon {
    font-size: 20px;
    color: rgba(153, 27, 27, 0.8);
  }
}

.modern-function-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 4px;
}

.function-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--background-color-white);
  border: 2px solid var(--card-border-color);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px var(--card-shadow-color);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, rgba(153, 27, 27, 0.8) 0%, rgba(212, 107, 8, 0.8) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 6px 16px var(--card-shadow-extend-color);
    border-color: rgba(153, 27, 27, 0.3);

    &::before {
      opacity: 1;
    }

    .function-icon {
      transform: scale(1.1) rotate(5deg);
      color: rgba(153, 27, 27, 1);
    }

    .arrow-icon {
      transform: translateX(4px);
    }
  }

  &:active {
    transform: translateX(2px);
  }
}

.function-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(153, 27, 27, 0.08) 0%, rgba(212, 107, 8, 0.08) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid rgba(153, 27, 27, 0.1);
}

.function-icon {
  font-size: 28px;
  color: rgba(153, 27, 27, 0.7);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.function-content {
  flex: 1;
  min-width: 0;
}

.function-title {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.function-action {
  margin: 0;
  font-size: 13px;
  color: var(--text-color);
  opacity: 0.6;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.arrow-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
}

@media (max-width: 992px) {
  .modern-function-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .function-card {
    padding: 16px;
  }

  .function-icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .function-icon {
    font-size: 24px;
  }
}
</style>
