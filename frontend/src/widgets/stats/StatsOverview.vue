<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import QuickStatsCard from "@/components/stats/QuickStatsCard.vue";
import ResourceProgressBar from "@/components/stats/ResourceProgressBar.vue";
import { t } from "@/lang/i18n";
import { useOverviewInfo } from "@/hooks/useOverviewInfo";
import type { LayoutCard } from "@/types";
import { computed } from "vue";
import {
  AppstoreOutlined,
  ClusterOutlined,
  DashboardOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SafetyOutlined
} from "@ant-design/icons-vue";

defineProps<{
  card: LayoutCard;
}>();

const { state } = useOverviewInfo();

// Quick stats for top row
const quickStats = computed(() => {
  if (!state.value) return [];

  const { system, version, record } = state.value;
  const free = Number((system.freemem / 1024 / 1024 / 1024).toFixed(1));
  const total = Number((system.totalmem / 1024 / 1024 / 1024).toFixed(1));
  const used = Number(total - free).toFixed(1);
  const memoryPercentage = ((Number(used) / total) * 100).toFixed(0);

  return [
    {
      title: "System Version",
      value: system.type,
      subtitle: `${system.platform} ${system.release}`,
      icon: DashboardOutlined,
      color: "var(--theme-primary-color)"
    },
    {
      title: "Node Version",
      value: system.node,
      subtitle: `MCSManager v${version}`,
      icon: ThunderboltOutlined,
      color: "var(--theme-primary-color)"
    },
    {
      title: "Memory Usage",
      value: `${memoryPercentage}%`,
      subtitle: `${used}GB / ${total}GB`,
      icon: DatabaseOutlined,
      color: "#52c41a"
    },
    {
      title: "Security Events",
      value: record.banips + record.illegalAccess,
      subtitle: `${record.banips} bans, ${record.illegalAccess} illegal`,
      icon: SafetyOutlined,
      color: record.banips + record.illegalAccess > 0 ? "#ff4d4f" : "#52c41a"
    }
  ];
});

// System resources for progress bars
const systemResources = computed(() => {
  if (!state.value) return { memory: { used: 0, total: 1 }, process: { memory: 0 } };

  const { system, process } = state.value;
  const free = Number((system.freemem / 1024 / 1024 / 1024).toFixed(1));
  const total = Number((system.totalmem / 1024 / 1024 / 1024).toFixed(1));
  const used = Number(total - free).toFixed(1);

  return {
    memory: { used: Number(used), total },
    process: { memory: Number((process.memory / 1024 / 1024).toFixed(1)) },
    loadavg: system.loadavg
  };
});

// Detailed info cards
const detailedInfo = computed(() => {
  if (!state.value) return [];

  const { system, version, specifiedDaemonVersion, record } = state.value;

  return [
    { label: "MCSManager Version", value: version },
    { label: "Daemon Version", value: specifiedDaemonVersion },
    { label: "Hostname", value: system.hostname },
    { label: "Current User", value: system.user.username },
    { label: "Server Time", value: new Date(system.time).toLocaleString() },
    { label: "Client Time", value: new Date().toLocaleString() },
    {
      label: "Load Average",
      value: system.loadavg.map((v) => Number(v).toFixed(2)).join(" - "),
      condition: !system.type.toLowerCase().includes("windows")
    },
    {
      label: "OS Version",
      value: `${system.version.length > 32 ? system.version.slice(0, 32) + "..." : system.version}`
    }
  ].filter((item) => item.condition !== false);
});
</script>

<template>
  <div class="stats-overview">
    <!-- Quick Stats Row -->
    <a-row :gutter="[12, 12]" class="stats-row">
      <a-col v-for="(stat, index) in quickStats" :key="index" :xs="24" :sm="12" :lg="6">
        <QuickStatsCard
          :title="stat.title"
          :value="stat.value"
          :subtitle="stat.subtitle"
          :icon="stat.icon"
        />
      </a-col>
    </a-row>

    <!-- System Resources -->
    <a-row :gutter="[12, 12]" class="stats-row">
      <a-col :span="24">
        <CardPanel>
          <template #title>
            <DashboardOutlined />
            System Resources
          </template>
          <template #body>
            <div class="resources-grid">
              <div class="resource-item">
                <ResourceProgressBar
                  label="System Memory"
                  :value="systemResources.memory.used"
                  :max="systemResources.memory.total"
                  unit="GB"
                  
                />
              </div>
              <div class="resource-item">
                <ResourceProgressBar
                  label="Process Memory"
                  :value="systemResources.process.memory"
                  :max="systemResources.memory.total"
                  unit="MB"
                  
                />
              </div>
              <div v-if="systemResources.loadavg && systemResources.loadavg.length > 0" class="resource-item">
                <div class="load-avg-display">
                  <div class="load-avg-label">System Load Average</div>
                  <div class="load-avg-values">
                    <div class="load-value">
                      <span class="load-period">1m</span>
                      <span class="load-number">{{ systemResources.loadavg[0]?.toFixed(2) }}</span>
                    </div>
                    <div class="load-value">
                      <span class="load-period">5m</span>
                      <span class="load-number">{{ systemResources.loadavg[1]?.toFixed(2) }}</span>
                    </div>
                    <div class="load-value">
                      <span class="load-period">15m</span>
                      <span class="load-number">{{ systemResources.loadavg[2]?.toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </CardPanel>
      </a-col>
    </a-row>

    <!-- Detailed System Information -->
    <a-row :gutter="[12, 12]" class="stats-row">
      <a-col :span="24">
        <CardPanel>
          <template #title>
            <ClusterOutlined />
            System Information
          </template>
          <template #body>
            <div class="info-grid">
              <div v-for="info in detailedInfo" :key="info.label" class="info-item">
                <span class="info-label">{{ info.label }}</span>
                <span class="info-value">{{ info.value }}</span>
              </div>
            </div>
          </template>
        </CardPanel>
      </a-col>
    </a-row>
  </div>
</template>

<style lang="scss" scoped>
.stats-overview {
  padding: 16px;
  min-height: calc(100vh - 140px);
}

.stats-row {
  margin-bottom: 12px;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.resource-item {
  padding: 12px;
  background: var(--theme-shadow-hover);
  border-radius: 8px;
  border: 1px solid var(--theme-shadow-hover);
}

.load-avg-display {
  .load-avg-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-gray-9);
    margin-bottom: 12px;
  }

  .load-avg-values {
    display: flex;
    justify-content: space-around;
    gap: 16px;
  }

  .load-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    background: var(--theme-primary-gradient);
    border-radius: 8px;
    flex: 1;
  }

  .load-period {
    font-size: 11px;
    color: var(--color-gray-7);
    font-weight: 500;
  }

  .load-number {
    font-size: 20px;
    font-weight: 700;
    background: var(--theme-primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-gray-1);
  border-radius: 8px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    border-left-color: var(--theme-primary-color);
    background: var(--theme-shadow-hover);
  }
}

.info-label {
  font-size: 13px;
  color: var(--color-gray-8);
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  color: var(--color-gray-11);
  font-weight: 600;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .stats-overview {
    padding: 12px;
  }

  .resources-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }

  .load-avg-values {
    flex-direction: column;
  }
}
</style>
