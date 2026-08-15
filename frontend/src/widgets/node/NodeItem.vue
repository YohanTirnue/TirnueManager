<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import IconBtn from "@/components/IconBtn.vue";
import NodeSimpleChart from "@/components/NodeSimpleChart.vue";
import ResourceProgressBar from "@/components/stats/ResourceProgressBar.vue";
import StatusDot from "@/components/stats/StatusDot.vue";
import { GLOBAL_INSTANCE_UUID } from "@/config/const";
import { useAppRouters } from "@/hooks/useAppRouters";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { useOverviewInfo, type ComputedNodeInfo } from "@/hooks/useOverviewInfo";
import { SocketStatus, useSocketIoClient } from "@/hooks/useSocketIo";
import { t } from "@/lang/i18n";
import { connectNode } from "@/services/apis";
import { arrayFilter } from "@/tools/array";
import { reportErrorMsg } from "@/tools/validator";
import { hasVersionUpdate } from "@/tools/version";
import type { LayoutCard } from "@/types";
import {
  BlockOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  DeleteOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { computed, onMounted, ref } from "vue";
import NodeDetailDialog from "./NodeDetailDialog.vue";

const { testFrontendSocket, socketStatus } = useSocketIoClient();

const nodeDetailDialog = ref<InstanceType<typeof NodeDetailDialog>>();

const props = defineProps<{
  item?: ComputedNodeInfo;
  card?: LayoutCard;
}>();

const { state: AllDaemonData } = useOverviewInfo();

const itemDaemonId = ref<string>();
const specifiedDaemonVersion = computed(() => AllDaemonData.value?.specifiedDaemonVersion);

const remoteNode = computed(() => {
  const myDaemon = AllDaemonData.value?.remote.find((node) => {
    return node.uuid === itemDaemonId.value;
  });
  return myDaemon ?? props.item;
});

if (props.card) {
  const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
  const daemonId = getMetaOrRouteValue("daemonId");
  if (daemonId) {
    itemDaemonId.value = daemonId;
  }
}

const tryConnectNode = async (uuid: string, showMsg = true) => {
  const { execute } = connectNode();
  try {
    await execute({
      params: {
        uuid: uuid
      }
    });
    if (showMsg) message.success(t("TXT_CODE_7f0c746d"));
  } catch (error: any) {
    reportErrorMsg(t("TXT_CODE_6a365d01"));
  }
};

const { toPage } = useAppRouters();

const detailList = (node: ComputedNodeInfo) => [
  {
    title: t("TXT_CODE_f52079a0"),
    value: `${node.ip}:${node.port || 'unknown'}`
  },
  {
    title: t("TXT_CODE_7c0b7608"),
    value: node.available ? t("TXT_CODE_823bfe63") : t("TXT_CODE_66ce073e"),
    warn: node.available === false,
    success: node.available === true,
    warnText: t("TXT_CODE_1c2efd38")
  },
  {
    title: t("TXT_CODE_930d2524"),
    value:
      socketStatus.value === SocketStatus.Connected
        ? t("TXT_CODE_e039b9b5")
        : t("TXT_CODE_23a3bd72"),
    warn: socketStatus.value === SocketStatus.Error,
    success: socketStatus.value === SocketStatus.Connected,
    loading: socketStatus.value === SocketStatus.Connecting,
    warnText: t("TXT_CODE_6b4a27dd")
  },
  {
    title: t("TXT_CODE_a788e3eb"),
    value: (node.memText || "") + "\n" + (node.cpuInfo || "")
  },

  {
    title: t("TXT_CODE_3d602459"),
    value: node.instanceStatus
  },

  {
    title: t("TXT_CODE_3d0885c0"),
    value: node.platformText
  },
  {
    title: t("TXT_CODE_81634069"),
    value: node.version,
    success: !hasVersionUpdate(specifiedDaemonVersion.value, node.version),
    warn: hasVersionUpdate(specifiedDaemonVersion.value, node.version) && node.available,
    warnText: t("TXT_CODE_e520908a")
  },
  {
    title: "Daemon ID",
    value: node.uuid,
    onlyCopy: true
  }
];

const nodeOperations = computed(() =>
  arrayFilter([
    {
      title: t("TXT_CODE_ae533703"),
      icon: FolderOpenOutlined,
      click: (item: ComputedNodeInfo) => {
        const daemonId = item.uuid;
        const instanceId = GLOBAL_INSTANCE_UUID;
        toPage({
          path: "/instances/terminal/files",
          query: {
            daemonId,
            instanceId
          }
        });
      },
      condition: () => remoteNode.value!.available
    },
    {
      title: t("TXT_CODE_524e3036"),
      icon: CodeOutlined,
      click: (item: ComputedNodeInfo) => {
        const daemonId = item.uuid;
        const instanceId = GLOBAL_INSTANCE_UUID;
        toPage({
          path: "/instances/terminal",
          query: {
            daemonId,
            instanceId
          }
        });
      },
      condition: () => remoteNode.value!.available
    },
    {
      title: t("TXT_CODE_e6c30866"),
      icon: BlockOutlined,
      click: (item: ComputedNodeInfo) => {
        const daemonId = item.uuid;
        toPage({
          path: "/node/image",
          query: {
            daemonId
          }
        });
      },
      condition: () => remoteNode.value!.available
    },
    {
      title: t("TXT_CODE_f8b28901"),
      icon: ReloadOutlined,
      click: async (node: ComputedNodeInfo) => {
        await tryConnectNode(node.uuid);
      },
      condition: () => !remoteNode.value!.available
    },
    {
      title: t("TXT_CODE_b5c7b82d"),
      icon: SettingOutlined,
      click: (node: ComputedNodeInfo) => {
        nodeDetailDialog.value?.openDialog(node, node.uuid);
      }
    }
  ])
);

// Computed properties for modern UI
const nodeStatus = computed<"online" | "offline" | "slow" | "error">(() => {
  if (!remoteNode.value?.available) return "offline";
  if (socketStatus.value === SocketStatus.Error) return "error";
  if (socketStatus.value === SocketStatus.Connecting) return "slow";
  if (socketStatus.value === SocketStatus.Connected) return "online";
  return "offline";
});

const resourceData = computed(() => {
  const node = remoteNode.value;
  if (!node) return null;

  // Parse memory from memText (e.g., "8.5GB / 16GB")
  const memMatch = node.memText?.match(/([\d.]+)GB\s*\/\s*([\d.]+)GB/);
  const memUsed = memMatch ? parseFloat(memMatch[1]) : 0;
  const memTotal = memMatch ? parseFloat(memMatch[2]) : 1;

  // Parse CPU from cpuInfo (e.g., "CPU: 45.2%")
  const cpuMatch = node.cpuInfo?.match(/([\d.]+)%/);
  const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;

  return {
    memory: { used: memUsed, total: memTotal },
    cpu: { usage: cpuUsage },
    instances: node.instanceStatus || "0 / 0"
  };
});

const quickActions = computed(() => [
  {
    title: t("TXT_CODE_ae533703"), // Files
    icon: FolderOpenOutlined,
    color: "var(--theme-primary-color)",
    show: remoteNode.value?.available,
    action: () => {
      const daemonId = remoteNode.value?.uuid;
      const instanceId = GLOBAL_INSTANCE_UUID;
      toPage({
        path: "/instances/terminal/files",
        query: { daemonId, instanceId }
      });
    }
  },
  {
    title: t("TXT_CODE_524e3036"), // Terminal
    icon: CodeOutlined,
    color: "var(--theme-primary-color)",
    show: remoteNode.value?.available,
    action: () => {
      const daemonId = remoteNode.value?.uuid;
      const instanceId = GLOBAL_INSTANCE_UUID;
      toPage({
        path: "/instances/terminal",
        query: { daemonId, instanceId }
      });
    }
  },
  {
    title: t("TXT_CODE_e6c30866"), // Images
    icon: BlockOutlined,
    color: "#52c41a",
    show: remoteNode.value?.available,
    action: () => {
      const daemonId = remoteNode.value?.uuid;
      toPage({
        path: "/node/image",
        query: { daemonId }
      });
    }
  },
  {
    title: t("TXT_CODE_f8b28901"), // Reconnect
    icon: ReloadOutlined,
    color: "#faad14",
    show: !remoteNode.value?.available,
    action: async () => {
      if (remoteNode.value) {
        await tryConnectNode(remoteNode.value.uuid);
      }
    }
  }
]);

onMounted(() => {
  testFrontendSocket(remoteNode.value);
});
</script>

<template>
  <div style="height: 100%" class="node-item-container">
    <CardPanel style="height: 100%" class="modern-node-card">
      <template #title>
        <div class="node-header">
          <div class="node-title-section">
            <CloudServerOutlined class="node-icon" />
            <div class="node-info">
              <div class="node-name">{{ remoteNode?.remarks || remoteNode?.ip || 'Unknown' }}</div>
              <div class="node-address">{{ remoteNode?.ip || 'unknown' }}:{{ remoteNode?.port || '?' }}</div>
            </div>
          </div>
          <StatusDot v-if="remoteNode" :status="nodeStatus" :pulse="true" show-label />
        </div>
      </template>

      <template v-if="remoteNode" #operator>
        <div class="quick-actions">
          <a-tooltip
            v-for="action in quickActions.filter((a) => a.show)"
            :key="action.title"
            :title="action.title"
          >
            <a-button
              type="text"
              class="action-btn"
              :style="{ color: action.color }"
              @click="action.action"
            >
              <component :is="action.icon" />
            </a-button>
          </a-tooltip>
          <a-tooltip :title="t('TXT_CODE_b5c7b82d')">
            <a-button
              type="text"
              class="action-btn settings-btn"
              @click="remoteNode && nodeDetailDialog?.openDialog(remoteNode, remoteNode.uuid)"
            >
              <SettingOutlined />
            </a-button>
          </a-tooltip>
        </div>
      </template>

      <template v-if="remoteNode && resourceData" #body>
        <!-- Resource Bars Section -->
        <div class="resources-section">
          <div class="resource-row">
            <ResourceProgressBar
              label="Memory Usage"
              :value="resourceData.memory.used"
              :max="resourceData.memory.total"
              unit="GB"
              
            />
          </div>
          <div class="resource-row">
            <ResourceProgressBar
              label="CPU Usage"
              :value="resourceData.cpu.usage"
              :max="100"
              unit="%"
              
            />
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">
              <AppstoreOutlined />
              Instances
            </div>
            <div class="stat-value">{{ resourceData.instances }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">
              <ThunderboltOutlined />
              Platform
            </div>
            <div class="stat-value">{{ remoteNode.platformText || "--" }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">
              <CloudServerOutlined />
              Version
            </div>
            <div class="stat-value" :class="{ 'version-warn': hasVersionUpdate(specifiedDaemonVersion, remoteNode.version) && remoteNode.available }">
              {{ remoteNode.version || "--" }}
              <a-tooltip v-if="hasVersionUpdate(specifiedDaemonVersion, remoteNode.version) && remoteNode.available" :title="t('TXT_CODE_e520908a')">
                <InfoCircleOutlined class="warn-icon" />
              </a-tooltip>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-label">
              <CodeOutlined />
              Daemon ID
            </div>
            <div class="stat-value daemon-id">
              <a-typography-text :copyable="{ text: remoteNode.uuid ?? '' }" />
            </div>
          </div>
        </div>

        <!-- Performance Chart -->
        <div class="chart-section">
          <NodeSimpleChart
            :cpu-data="remoteNode.cpuChartData ?? []"
            :mem-data="remoteNode.memChartData ?? []"
          />
        </div>
      </template>
    </CardPanel>
  </div>
  <NodeDetailDialog ref="nodeDetailDialog"></NodeDetailDialog>
</template>

<style lang="scss" scoped>
.node-item-container {
  height: 100%;
}

.modern-node-card {
  background: var(--theme-primary-gradient);
  border: 1px solid var(--theme-shadow-hover);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: var(--theme-shadow-hover);
    box-shadow: 0 4px 16px var(--theme-shadow-hover);
  }
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}

.node-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.node-icon {
  font-size: 24px;
  color: var(--theme-primary-color);
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.node-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-gray-11);
}

.node-address {
  font-size: 12px;
  color: var(--color-gray-8);
  font-family: monospace;
}

.quick-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.action-btn {
  font-size: 18px;
  padding: 4px 8px;
  transition: all 0.2s ease;
  border-radius: 6px;

  &:hover {
    background: var(--theme-shadow-hover);
    transform: translateY(-2px);
  }
}

.settings-btn {
  color: var(--color-gray-8);

  &:hover {
    color: var(--theme-primary-color);
  }
}

.resources-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.resource-row {
  background: var(--theme-shadow-hover);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--theme-shadow-hover);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  background: var(--color-gray-1);
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    border-left-color: var(--theme-primary-color);
    background: var(--theme-shadow-hover);
  }
}

.stat-label {
  font-size: 12px;
  color: var(--color-gray-8);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-gray-11);
  display: flex;
  align-items: center;
  gap: 6px;

  &.version-warn {
    color: #faad14;
  }

  &.daemon-id {
    font-family: monospace;
    font-size: 12px;
  }
}

.warn-icon {
  color: #faad14;
  font-size: 14px;
}

.chart-section {
  background: var(--theme-shadow-hover);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--theme-shadow-hover);
}

@media (max-width: 992px) {
  .node-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .action-btn {
    font-size: 16px;
    padding: 4px 6px;
  }

  .node-icon {
    font-size: 20px;
  }

  .quick-actions {
    gap: 8px;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .node-header {
    gap: 12px;
  }

  .quick-actions {
    justify-content: center;
  }

  .action-btn {
    font-size: 14px;
    padding: 6px 10px;
  }
}
</style>
