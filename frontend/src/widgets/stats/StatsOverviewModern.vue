<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart, BarChart, PieChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from "echarts/components";
import * as echarts from "echarts/core";
import {
  LineChartOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  AppstoreOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  GlobalOutlined
} from "@ant-design/icons-vue";
import { useOverviewInfo } from "@/hooks/useOverviewInfo";
import CardPanel from "@/components/CardPanel.vue";
import type { LayoutCard } from "@/types";

defineProps<{
  card: LayoutCard;
}>();

// Register ECharts components
use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
]);

const { state: overviewInfo } = useOverviewInfo();

// Daemon selector
const selectedDaemon = ref<string>("all");

// Get list of available daemons for the selector
const daemonOptions = computed(() => {
  const options = [{ label: "All Nodes", value: "all" }];
  if (overviewInfo.value?.remote) {
    overviewInfo.value.remote.forEach((node) => {
      options.push({
        label: node.remarks || node.ip || "Unknown Node",
        value: node.uuid
      });
    });
  }
  return options;
});

// Get selected daemon data
const selectedDaemonData = computed(() => {
  if (!overviewInfo.value) return null;
  if (selectedDaemon.value === "all") return null;
  return overviewInfo.value.remote?.find((node) => node.uuid === selectedDaemon.value);
});

// Chart refs
const cpuChartRef = ref<HTMLDivElement>();
const memoryChartRef = ref<HTMLDivElement>();
const instanceChartRef = ref<HTMLDivElement>();
const networkChartRef = ref<HTMLDivElement>();

let cpuChart: echarts.ECharts | null = null;
let memoryChart: echarts.ECharts | null = null;
let instanceChart: echarts.ECharts | null = null;
let networkChart: echarts.ECharts | null = null;

// Real-time data tracking with historical values
const cpuHistory = ref<number[]>([]);
const memoryHistory = ref<number[]>([]);
const maxHistoryLength = 15; // Reduced for better performance

// Quick Stats with REAL data - filtered by selected daemon
const quickStats = computed(() => {
  if (!overviewInfo.value) return [];

  const daemon = selectedDaemonData.value;

  // If specific daemon selected, show that daemon's stats
  if (daemon) {
    const sys = daemon.system;
    const cpuUsage = (sys?.cpuUsage || 0) * 100;
    const totalMem = sys?.totalmem || 1;
    const freeMem = sys?.freemem || 0;
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    const usedMemGB = (totalMem - freeMem) / 1024 / 1024 / 1024;

    return [
      {
        title: "Node Status",
        value: daemon.available ? "Online" : "Offline",
        icon: CloudServerOutlined,
        color: daemon.available ? "#52c41a" : "#ff4d4f",
        subtitle: sys?.platform || 'Unknown'
      },
      {
        title: "Instances",
        value: daemon.instance?.total || 0,
        icon: AppstoreOutlined,
        color: "var(--theme-primary-color)",
        subtitle: `${daemon.instance?.running || 0} running now`
      },
      {
        title: "CPU Usage",
        value: `${cpuUsage.toFixed(1)}%`,
        icon: ThunderboltOutlined,
        color: cpuUsage > 80 ? "#ff4d4f" : cpuUsage > 50 ? "#faad14" : "#52c41a",
        subtitle: `Load: ${sys?.loadavg?.[0]?.toFixed(2) || 'N/A'}`
      },
      {
        title: "Memory",
        value: `${memUsage.toFixed(1)}%`,
        icon: DatabaseOutlined,
        color: memUsage > 80 ? "#ff4d4f" : memUsage > 50 ? "#faad14" : "#52c41a",
        subtitle: `${usedMemGB.toFixed(1)}GB used`
      }
    ];
  }

  // Show aggregated stats for all nodes
  const { system, remote, totalInstance, runningInstance, cpu, mem } = overviewInfo.value;

  return [
    {
      title: "Total Nodes",
      value: remote?.length || 0,
      icon: CloudServerOutlined,
      color: "var(--theme-primary-color)",
      subtitle: `${system?.platform || 'Unknown'} ${system?.type || ''}`
    },
    {
      title: "Total Instances",
      value: totalInstance || 0,
      icon: AppstoreOutlined,
      color: "var(--theme-primary-color)",
      subtitle: `${runningInstance || 0} running now`
    },
    {
      title: "CPU Usage",
      value: `${(cpu || 0).toFixed(1)}%`,
      icon: ThunderboltOutlined,
      color: cpu > 80 ? "#ff4d4f" : cpu > 50 ? "#faad14" : "#52c41a",
      subtitle: `Load: ${system?.loadavg?.[0]?.toFixed(2) || 'N/A'}`
    },
    {
      title: "Memory",
      value: `${(mem || 0).toFixed(1)}%`,
      icon: DatabaseOutlined,
      color: mem > 80 ? "#ff4d4f" : mem > 50 ? "#faad14" : "#52c41a",
      subtitle: `${((system?.totalmem - system?.freemem) / 1024 / 1024 / 1024 || 0).toFixed(1)}GB used`
    }
  ];
});

// System Resources with REAL data - filtered by selected daemon
const systemResources = computed(() => {
  const daemon = selectedDaemonData.value;

  // Use daemon-specific data if selected
  const sys = daemon?.system || overviewInfo.value?.system;
  if (!sys) return { cpu: { usage: 0, cores: 0 }, memory: { used: 0, total: 0, percentage: 0 }, disk: { used: 0, total: 0, percentage: 0 } };

  const totalMem = sys.totalmem / 1024 / 1024 / 1024;
  const freeMem = sys.freemem / 1024 / 1024 / 1024;
  const usedMem = totalMem - freeMem;

  const cpuUsage = daemon ? ((sys as any).cpuUsage || 0) * 100 : (overviewInfo.value?.cpu || 0);
  const memPercentage = daemon ? ((sys.totalmem - sys.freemem) / sys.totalmem) * 100 : (overviewInfo.value?.mem || 0);

  return {
    cpu: {
      usage: cpuUsage,
      cores: 0
    },
    memory: {
      used: usedMem,
      total: totalMem,
      percentage: memPercentage
    },
    disk: {
      used: 0,
      total: 0,
      percentage: 0
    }
  };
});

// Initialize charts
const initCharts = () => {
  // Initialize history with current values
  if (overviewInfo.value) {
    cpuHistory.value = [overviewInfo.value.cpu || 0];
    memoryHistory.value = [overviewInfo.value.mem || 0];
  }

  // CPU Chart
  if (cpuChartRef.value) {
    cpuChart = echarts.init(cpuChartRef.value);
    updateCPUChart();
  }

  // Memory Chart
  if (memoryChartRef.value) {
    memoryChart = echarts.init(memoryChartRef.value);
    updateMemoryChart();
  }

  // Instance Distribution
  if (instanceChartRef.value) {
    instanceChart = echarts.init(instanceChartRef.value);
    updateInstanceChart();
  }

  // Network/System Info Chart
  if (networkChartRef.value) {
    networkChart = echarts.init(networkChartRef.value);
    updateNetworkChart();
  }
};

// Update CPU Chart
const updateCPUChart = () => {
  if (!cpuChart || !overviewInfo.value) return;

  const labels = cpuHistory.value.map((_, i) => `${i + 1}`);

  cpuChart.setOption({
    animation: false, // Disable animation for better performance
    tooltip: {
      trigger: "axis",
      formatter: "{b}: {c}%"
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      show: false
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: { formatter: "{value}%" }
    },
    series: [
      {
        name: "CPU Usage",
        type: "line",
        smooth: true,
        animation: false,
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "var(--theme-shadow-hover)" },
              { offset: 1, color: "var(--theme-shadow-hover)" }
            ]
          }
        },
        lineStyle: {
          color: "var(--theme-primary-color)",
          width: 3
        },
        itemStyle: {
          color: "var(--theme-primary-color)"
        },
        data: cpuHistory.value
      }
    ]
  }, { notMerge: false, lazyUpdate: true });
};

// Update Memory Chart
const updateMemoryChart = () => {
  if (!memoryChart || !overviewInfo.value) return;

  const labels = memoryHistory.value.map((_, i) => `${i + 1}`);

  memoryChart.setOption({
    animation: false,
    tooltip: {
      trigger: "axis",
      formatter: "{b}: {c}%"
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: labels,
      show: false
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: { formatter: "{value}%" }
    },
    series: [
      {
        name: "Memory Usage",
        type: "bar",
        barWidth: "60%",
        animation: false,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "var(--theme-primary-color)" },
              { offset: 1, color: "rgba(212, 175, 55, 0.5)" }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        data: memoryHistory.value
      }
    ]
  }, { notMerge: false, lazyUpdate: true });
};

// Update Instance Chart
const updateInstanceChart = () => {
  if (!instanceChart || !overviewInfo.value) return;

  const daemon = selectedDaemonData.value;
  const running = daemon ? (daemon.instance?.running || 0) : (overviewInfo.value.runningInstance || 0);
  const total = daemon ? (daemon.instance?.total || 0) : (overviewInfo.value.totalInstance || 0);
  const stopped = total - running;

  instanceChart.setOption({
    animation: false,
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderColor: "#e8e8e8",
      borderWidth: 1,
      textStyle: {
        color: "#333"
      }
    },
    legend: {
      bottom: 10,
      left: "center",
      textStyle: {
        color: "#666",
        fontSize: 14,
        fontWeight: 500
      },
      itemWidth: 16,
      itemHeight: 16,
      itemGap: 20
    },
    series: [
      {
        name: "Instances",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        animation: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fff",
          borderWidth: 3
        },
        label: {
          show: true,
          fontSize: 14,
          fontWeight: "600",
          color: "#333",
          formatter: "{b}\n{d}%"
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10,
          lineStyle: {
            width: 2
          }
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 18,
            fontWeight: "bold"
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.3)"
          }
        },
        data: [
          {
            value: running,
            name: "Running",
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "var(--theme-primary-color)" },
                  { offset: 1, color: "var(--theme-primary-color)" }
                ]
              }
            }
          },
          {
            value: stopped,
            name: "Stopped",
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "#95a5a6" },
                  { offset: 1, color: "#7f8c8d" }
                ]
              }
            }
          }
        ]
      }
    ]
  }, { notMerge: false, lazyUpdate: true });
};

// Update Network Chart (shows nodes status)
const updateNetworkChart = () => {
  if (!networkChart || !overviewInfo.value) return;

  const daemon = selectedDaemonData.value;
  const sys = daemon?.system || overviewInfo.value.system;
  const loadAvg = sys?.loadavg || [0, 0, 0];

  networkChart.setOption({
    animation: false,
    tooltip: {
      trigger: "axis"
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: ["1 min", "5 min", "15 min"]
    },
    yAxis: {
      type: "value",
      name: "Load"
    },
    series: [
      {
        name: "Load Average",
        type: "line",
        smooth: true,
        animation: false,
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(24, 144, 255, 0.4)" },
              { offset: 1, color: "rgba(24, 144, 255, 0.05)" }
            ]
          }
        },
        lineStyle: {
          color: "#1890ff",
          width: 3
        },
        data: [loadAvg[0], loadAvg[1], loadAvg[2]]
      }
    ]
  }, { notMerge: false, lazyUpdate: true });
};

// Update charts with REAL data
const updateCharts = () => {
  if (!overviewInfo.value) return;

  const daemon = selectedDaemonData.value;

  // Get CPU/mem values based on selection
  let cpuValue: number;
  let memValue: number;

  if (daemon?.system) {
    cpuValue = (daemon.system.cpuUsage || 0) * 100;
    memValue = ((daemon.system.totalmem - daemon.system.freemem) / daemon.system.totalmem) * 100;
  } else {
    cpuValue = overviewInfo.value.cpu || 0;
    memValue = overviewInfo.value.mem || 0;
  }

  // Update CPU history
  cpuHistory.value.push(cpuValue);
  if (cpuHistory.value.length > maxHistoryLength) {
    cpuHistory.value.shift();
  }

  // Update Memory history
  memoryHistory.value.push(memValue);
  if (memoryHistory.value.length > maxHistoryLength) {
    memoryHistory.value.shift();
  }

  // Update all charts
  updateCPUChart();
  updateMemoryChart();
  updateInstanceChart();
  updateNetworkChart();
};

// Reset history when daemon selection changes
watch(selectedDaemon, () => {
  cpuHistory.value = [];
  memoryHistory.value = [];
  updateCharts();
});

let updateInterval: number | null = null;

onMounted(() => {
  // Wait for data to load before initializing charts
  setTimeout(() => {
    initCharts();
    updateInterval = window.setInterval(updateCharts, 5000);
  }, 500);

  // Handle window resize with debouncing for better performance
  let resizeTimeout: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      cpuChart?.resize();
      memoryChart?.resize();
      instanceChart?.resize();
      networkChart?.resize();
    }, 150);
  });
});

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval);
  cpuChart?.dispose();
  memoryChart?.dispose();
  instanceChart?.dispose();
  networkChart?.dispose();
});
</script>

<template>
  <div class="modern-stats">
    <!-- Hero Banner -->
    <div class="stats-hero">
      <div class="hero-content">
        <div class="hero-icon">
          <LineChartOutlined />
        </div>
        <div class="hero-text">
          <h1>System Statistics</h1>
          <p>Real-time monitoring and analytics dashboard</p>
        </div>
      </div>
      <div class="hero-controls">
        <div class="daemon-selector">
          <GlobalOutlined />
          <a-select
            v-model:value="selectedDaemon"
            :options="daemonOptions"
            style="min-width: 180px"
            size="large"
          />
        </div>
        <div class="hero-time">
          <ClockCircleOutlined />
          {{ new Date().toLocaleString() }}
        </div>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="quick-stats-grid">
      <div
        v-for="(stat, index) in quickStats"
        :key="index"
        class="stat-card"
        :style="{ '--accent-color': stat.color }"
      >
        <div class="stat-icon">
          <component :is="stat.icon" />
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ stat.title }}</div>
          <div class="stat-value">
            {{ stat.value }}
          </div>
          <div class="stat-subtitle">{{ stat.subtitle }}</div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <!-- CPU Usage Chart -->
      <CardPanel class="chart-card">
        <template #title>
          <DashboardOutlined /> CPU Usage (24h)
        </template>
        <template #body>
          <div ref="cpuChartRef" class="chart"></div>
        </template>
      </CardPanel>

      <!-- Memory Usage Chart -->
      <CardPanel class="chart-card">
        <template #title>
          <DashboardOutlined /> Memory Usage (24h)
        </template>
        <template #body>
          <div ref="memoryChartRef" class="chart"></div>
        </template>
      </CardPanel>
    </div>

    <!-- Second Row -->
    <div class="charts-row">
      <!-- Instance Distribution -->
      <CardPanel class="chart-card">
        <template #title>
          <AppstoreOutlined /> Instance Distribution
        </template>
        <template #body>
          <div ref="instanceChartRef" class="chart-pie"></div>
        </template>
      </CardPanel>

      <!-- Load Average -->
      <CardPanel class="chart-card">
        <template #title>
          <ThunderboltOutlined /> System Load Average
        </template>
        <template #body>
          <div ref="networkChartRef" class="chart"></div>
        </template>
      </CardPanel>
    </div>

    <!-- System Resources & Activity -->
    <div class="bottom-row">
      <!-- System Resources -->
      <CardPanel class="resources-card">
        <template #title>
          <CloudServerOutlined /> System Resources
        </template>
        <template #body>
          <div class="resource-item">
            <div class="resource-header">
              <span>CPU</span>
              <span class="resource-value">{{ systemResources.cpu.usage.toFixed(1) }}%</span>
            </div>
            <div class="resource-bar">
              <div
                class="resource-fill"
                :style="{ width: systemResources.cpu.usage + '%', background: 'var(--theme-primary-color)' }"
              />
            </div>
            <div class="resource-meta">{{ systemResources.cpu.cores }} Cores</div>
          </div>

          <div class="resource-item">
            <div class="resource-header">
              <span>Memory</span>
              <span class="resource-value">{{ systemResources.memory.percentage.toFixed(1) }}%</span>
            </div>
            <div class="resource-bar">
              <div
                class="resource-fill"
                :style="{ width: systemResources.memory.percentage + '%', background: 'var(--theme-primary-color)' }"
              />
            </div>
            <div class="resource-meta">
              {{ systemResources.memory.used.toFixed(1) }}GB / {{ systemResources.memory.total.toFixed(1) }}GB
            </div>
          </div>

          <div class="resource-item">
            <div class="resource-header">
              <span>Disk</span>
              <span class="resource-value">{{ systemResources.disk.percentage.toFixed(1) }}%</span>
            </div>
            <div class="resource-bar">
              <div
                class="resource-fill"
                :style="{ width: systemResources.disk.percentage + '%', background: '#52c41a' }"
              />
            </div>
            <div class="resource-meta">
              {{ systemResources.disk.used.toFixed(1) }}GB / {{ systemResources.disk.total.toFixed(1) }}GB
            </div>
          </div>
        </template>
      </CardPanel>

      <!-- System Information -->
      <CardPanel class="activity-card">
        <template #title>
          <CheckCircleOutlined /> {{ selectedDaemonData ? 'Node Information' : 'System Information' }}
        </template>
        <template #body>
          <div class="info-grid" v-if="overviewInfo">
            <template v-if="selectedDaemonData">
              <!-- Daemon-specific info -->
              <div class="info-item">
                <span class="info-label">Node Name</span>
                <span class="info-value">{{ selectedDaemonData.remarks || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Hostname</span>
                <span class="info-value">{{ selectedDaemonData.system?.hostname || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">IP Address</span>
                <span class="info-value">{{ selectedDaemonData.ip || 'N/A' }}:{{ selectedDaemonData.port || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Platform</span>
                <span class="info-value">{{ selectedDaemonData.system?.platform || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">CPU Usage</span>
                <span class="info-value">{{ ((selectedDaemonData.system?.cpuUsage || 0) * 100).toFixed(1) }}%</span>
              </div>
              <div class="info-item">
                <span class="info-label">Uptime</span>
                <span class="info-value">{{ Math.floor((selectedDaemonData.system?.uptime || 0) / 3600) }}h</span>
              </div>
            </template>
            <template v-else>
              <!-- Aggregated panel info -->
              <div class="info-item">
                <span class="info-label">MCS Version</span>
                <span class="info-value">{{ overviewInfo.version }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Hostname</span>
                <span class="info-value">{{ overviewInfo.system?.hostname || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Platform</span>
                <span class="info-value">{{ overviewInfo.system?.platform || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Node.js</span>
                <span class="info-value">{{ overviewInfo.system?.node || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Uptime</span>
                <span class="info-value">{{ Math.floor((overviewInfo.system?.uptime || 0) / 3600) }}h</span>
              </div>
              <div class="info-item">
                <span class="info-label">Server Time</span>
                <span class="info-value">{{ new Date(overviewInfo.system?.time || 0).toLocaleTimeString() }}</span>
              </div>
            </template>
          </div>
        </template>
      </CardPanel>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modern-stats {
  width: 100%;
  padding: 0 24px 24px 24px;
}

// Hero Banner
.stats-hero {
  background: var(--theme-primary-gradient);
  border-radius: 12px;
  padding: 20px 32px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 16px var(--theme-shadow-hover);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255,255,255,0.08), transparent);
    border-radius: 50%;
  }
}

.hero-content {
  display: flex;
  align-items: center;
  gap: 24px;
  position: relative;
  z-index: 1;
}

.hero-icon {
  font-size: 56px;
  color: white;
  animation: pulse-scale 2s ease-in-out infinite;
}

@keyframes pulse-scale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.hero-text {
  h1 {
    font-size: 36px;
    font-weight: 800;
    color: white;
    margin: 0 0 8px 0;
    text-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  p {
    font-size: 16px;
    color: rgba(255,255,255,0.95);
    margin: 0;
  }
}

.hero-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.daemon-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 18px;

  :deep(.ant-select) {
    .ant-select-selector {
      background: rgba(255, 255, 255, 0.15) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      color: white !important;
      backdrop-filter: none; /* Optimized */

      .ant-select-selection-item {
        color: white !important;
        font-weight: 600;
      }
    }

    .ant-select-arrow {
      color: white !important;
    }

    &:hover .ant-select-selector {
      border-color: rgba(255, 255, 255, 0.5) !important;
    }
  }
}

.hero-time {
  color: white;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.9;
}

// Quick Stats Grid
.quick-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--background-color-white);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transition: all 0.3s ease;
  border-left: 4px solid var(--accent-color);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-color), var(--accent-color));
  background-opacity: 0.15;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--color-gray-7);
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--text-color);
  line-height: 1;
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-subtitle {
  font-size: 12px;
  color: var(--color-gray-6);
}

// Charts
.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.chart-card {
  :deep(.card-panel-content) {
    padding: 16px;
  }
}

.chart {
  width: 100%;
  height: 300px;
}

.chart-pie {
  width: 100%;
  height: 350px;
}

// Bottom Row
.bottom-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

// Resources
.resources-card {
  :deep(.card-panel-content) {
    padding: 24px;
  }
}

.resource-item {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.resource-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-color);
}

.resource-value {
  color: var(--theme-primary-color);
  font-size: 18px;
}

.resource-bar {
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.resource-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s ease;
}

.resource-meta {
  font-size: 12px;
  color: #999;
}

// System Information
.activity-card {
  :deep(.card-panel-content) {
    padding: 24px;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--theme-shadow-hover);
  border-radius: 8px;
  border-left: 3px solid var(--theme-primary-color);
  transition: all 0.2s ease;

  &:hover {
    background: var(--theme-shadow-hover);
    transform: translateX(4px);
  }
}

.info-label {
  font-size: 12px;
  color: var(--color-gray-7);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 16px;
  color: var(--text-color);
  font-weight: 700;
  word-break: break-all;
}

// Responsive
@media (max-width: 1200px) {
  .bottom-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .modern-stats {
    padding: 0 12px 12px 12px;
  }

  .stats-hero {
    flex-direction: column;
    gap: 16px;
    text-align: center;
    padding: 16px 20px;
  }

  .hero-icon {
    font-size: 40px;
  }

  .hero-text h1 {
    font-size: 24px;
  }

  .hero-text p {
    font-size: 14px;
  }

  .hero-time {
    font-size: 14px;
  }

  .charts-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .quick-stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
    gap: 12px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 24px;
  }

  .stat-value {
    font-size: 24px;
  }

  .bottom-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .chart {
    height: 250px;
  }

  .chart-pie {
    height: 280px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
