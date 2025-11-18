<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
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
  CheckCircleOutlined
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
const maxHistoryLength = 20;

// Quick Stats with REAL data
const quickStats = computed(() => {
  if (!overviewInfo.value) return [];

  const { system, remote, totalInstance, runningInstance, cpu, mem } = overviewInfo.value;

  return [
    {
      title: "Total Nodes",
      value: remote?.length || 0,
      icon: CloudServerOutlined,
      color: "#FF8C42",
      subtitle: `${system?.platform || 'Unknown'} ${system?.type || ''}`
    },
    {
      title: "Total Instances",
      value: totalInstance || 0,
      icon: AppstoreOutlined,
      color: "#D4AF37",
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

// System Resources with REAL data
const systemResources = computed(() => {
  const sys = overviewInfo.value?.system;
  if (!sys) return { cpu: { usage: 0, cores: 0 }, memory: { used: 0, total: 0, percentage: 0 }, disk: { used: 0, total: 0, percentage: 0 } };

  const totalMem = sys.totalmem / 1024 / 1024 / 1024;
  const freeMem = sys.freemem / 1024 / 1024 / 1024;
  const usedMem = totalMem - freeMem;

  return {
    cpu: {
      usage: overviewInfo.value?.cpu || 0,
      cores: 0 // System type doesn't provide CPU core count
    },
    memory: {
      used: usedMem,
      total: totalMem,
      percentage: overviewInfo.value?.mem || 0
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
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(255, 140, 66, 0.4)" },
              { offset: 1, color: "rgba(255, 140, 66, 0.05)" }
            ]
          }
        },
        lineStyle: {
          color: "#FF8C42",
          width: 3
        },
        itemStyle: {
          color: "#FF8C42"
        },
        data: cpuHistory.value
      }
    ]
  });
};

// Update Memory Chart
const updateMemoryChart = () => {
  if (!memoryChart || !overviewInfo.value) return;

  const labels = memoryHistory.value.map((_, i) => `${i + 1}`);

  memoryChart.setOption({
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
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#D4AF37" },
              { offset: 1, color: "rgba(212, 175, 55, 0.5)" }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        data: memoryHistory.value
      }
    ]
  });
};

// Update Instance Chart
const updateInstanceChart = () => {
  if (!instanceChart || !overviewInfo.value) return;

  const running = overviewInfo.value.runningInstance || 0;
  const stopped = (overviewInfo.value.totalInstance || 0) - running;

  instanceChart.setOption({
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)"
    },
    legend: {
      bottom: 10,
      left: "center"
    },
    series: [
      {
        name: "Instances",
        type: "pie",
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: "#fff",
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: "bold"
          }
        },
        data: [
          { value: running, name: "Running", itemStyle: { color: "#52c41a" } },
          { value: stopped, name: "Stopped", itemStyle: { color: "#ff4d4f" } }
        ]
      }
    ]
  });
};

// Update Network Chart (shows nodes status)
const updateNetworkChart = () => {
  if (!networkChart || !overviewInfo.value) return;

  const sys = overviewInfo.value.system;
  const loadAvg = sys?.loadavg || [0, 0, 0];

  networkChart.setOption({
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
  });
};

// Update charts with REAL data
const updateCharts = () => {
  if (!overviewInfo.value) return;

  // Update CPU history
  cpuHistory.value.push(overviewInfo.value.cpu || 0);
  if (cpuHistory.value.length > maxHistoryLength) {
    cpuHistory.value.shift();
  }

  // Update Memory history
  memoryHistory.value.push(overviewInfo.value.mem || 0);
  if (memoryHistory.value.length > maxHistoryLength) {
    memoryHistory.value.shift();
  }

  // Update all charts
  updateCPUChart();
  updateMemoryChart();
  updateInstanceChart();
  updateNetworkChart();
};

let updateInterval: number | null = null;

onMounted(() => {
  // Wait for data to load before initializing charts
  setTimeout(() => {
    initCharts();
    updateInterval = window.setInterval(updateCharts, 3000);
  }, 500);

  // Handle window resize
  window.addEventListener("resize", () => {
    cpuChart?.resize();
    memoryChart?.resize();
    instanceChart?.resize();
    networkChart?.resize();
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
      <div class="hero-time">
        <ClockCircleOutlined />
        {{ new Date().toLocaleString() }}
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
                :style="{ width: systemResources.cpu.usage + '%', background: '#FF8C42' }"
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
                :style="{ width: systemResources.memory.percentage + '%', background: '#D4AF37' }"
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
          <CheckCircleOutlined /> System Information
        </template>
        <template #body>
          <div class="info-grid" v-if="overviewInfo">
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
          </div>
        </template>
      </CardPanel>
    </div>
  </div>
</template>

<style scoped lang="scss">
.modern-stats {
  max-width: 1600px;
  margin: 0 auto;
  padding: 24px;
}

// Hero Banner
.stats-hero {
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 50%, #D4AF37 100%);
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8px 32px rgba(255, 140, 66, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(255,255,255,0.1), transparent);
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

.hero-time {
  color: white;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 1;
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
  opacity: 0.15;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--accent-color);
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
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
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
  color: #FF8C42;
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
  background: rgba(255, 140, 66, 0.05);
  border-radius: 8px;
  border-left: 3px solid #FF8C42;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 140, 66, 0.1);
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
  .stats-hero {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .hero-text h1 {
    font-size: 28px;
  }

  .charts-row {
    grid-template-columns: 1fr;
  }

  .quick-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
