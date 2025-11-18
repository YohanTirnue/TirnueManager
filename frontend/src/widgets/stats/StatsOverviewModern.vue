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
  UserOutlined,
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
const activityChartRef = ref<HTMLDivElement>();

let cpuChart: echarts.ECharts | null = null;
let memoryChart: echarts.ECharts | null = null;
let instanceChart: echarts.ECharts | null = null;
let activityChart: echarts.ECharts | null = null;

// Mock data for charts (replace with real data)
const cpuData = ref(Array.from({ length: 24 }, () => Math.random() * 100));
const memoryData = ref(Array.from({ length: 24 }, () => Math.random() * 100));
const timeLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

// Quick Stats
const quickStats = computed(() => [
  {
    title: "Total Daemons",
    value: overviewInfo.value?.remote?.length || 0,
    icon: CloudServerOutlined,
    color: "#FF8C42",
    trend: "+5.2%",
    subtitle: "Active nodes"
  },
  {
    title: "Total Instances",
    value: overviewInfo.value?.totalInstance || 0,
    icon: AppstoreOutlined,
    color: "#D4AF37",
    trend: "+12.3%",
    subtitle: "Running servers"
  },
  {
    title: "Running",
    value: overviewInfo.value?.runningInstance || 0,
    icon: ThunderboltOutlined,
    color: "#52c41a",
    trend: "+8.1%",
    subtitle: "Active now"
  },
  {
    title: "CPU Usage",
    value: `${overviewInfo.value?.cpu || 0}%`,
    icon: UserOutlined,
    color: "#1890ff",
    trend: "+3.4%",
    subtitle: "System load"
  }
]);

// System Resources
const systemResources = computed(() => {
  const sys = overviewInfo.value?.system;
  return {
    cpu: {
      usage: overviewInfo.value?.cpu || 0,
      cores: 4
    },
    memory: {
      used: sys ? (sys.totalmem - sys.freemem) / 1024 / 1024 / 1024 : 0,
      total: sys ? sys.totalmem / 1024 / 1024 / 1024 : 16,
      percentage: overviewInfo.value?.mem || 0
    },
    disk: {
      used: 0,
      total: 100,
      percentage: 0
    }
  };
});

// Recent Activity
const recentActivity = [
  { type: "instance", action: "started", name: "Survival Server", time: "2 min ago", status: "success" },
  { type: "daemon", action: "connected", name: "Node-US-01", time: "5 min ago", status: "success" },
  { type: "instance", action: "stopped", name: "Creative Build", time: "12 min ago", status: "warning" },
  { type: "user", action: "logged in", name: "Admin", time: "15 min ago", status: "info" },
  { type: "instance", action: "started", name: "Minigames Hub", time: "20 min ago", status: "success" }
];

// Initialize charts
const initCharts = () => {
  // CPU Chart
  if (cpuChartRef.value) {
    cpuChart = echarts.init(cpuChartRef.value);
    cpuChart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
          label: { backgroundColor: "#6a7985" }
        }
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
        data: timeLabels
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
          data: cpuData.value
        }
      ]
    });
  }

  // Memory Chart
  if (memoryChartRef.value) {
    memoryChart = echarts.init(memoryChartRef.value);
    memoryChart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" }
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        containLabel: true
      },
      xAxis: {
        type: "category",
        data: timeLabels
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
          data: memoryData.value
        }
      ]
    });
  }

  // Instance Distribution
  if (instanceChartRef.value) {
    instanceChart = echarts.init(instanceChartRef.value);
    instanceChart.setOption({
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)"
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
            { value: overviewInfo.value?.runningInstance || 0, name: "Running", itemStyle: { color: "#52c41a" } },
            { value: (overviewInfo.value?.totalInstance || 0) - (overviewInfo.value?.runningInstance || 0), name: "Stopped", itemStyle: { color: "#ff4d4f" } },
            { value: 0, name: "Sleeping", itemStyle: { color: "#faad14" } }
          ]
        }
      ]
    });
  }

  // Activity Chart
  if (activityChartRef.value) {
    activityChart = echarts.init(activityChartRef.value);
    const activityData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 50));
    activityChart.setOption({
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
        data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      },
      yAxis: {
        type: "value"
      },
      series: [
        {
          name: "Actions",
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
          data: activityData
        }
      ]
    });
  }
};

// Update charts with random data (simulate real-time)
const updateCharts = () => {
  cpuData.value.shift();
  cpuData.value.push(Math.random() * 100);
  memoryData.value.shift();
  memoryData.value.push(Math.random() * 100);

  cpuChart?.setOption({
    series: [{ data: cpuData.value }]
  });

  memoryChart?.setOption({
    series: [{ data: memoryData.value }]
  });
};

let updateInterval: number | null = null;

onMounted(() => {
  initCharts();
  updateInterval = window.setInterval(updateCharts, 3000);

  // Handle window resize
  window.addEventListener("resize", () => {
    cpuChart?.resize();
    memoryChart?.resize();
    instanceChart?.resize();
    activityChart?.resize();
  });
});

onUnmounted(() => {
  if (updateInterval) clearInterval(updateInterval);
  cpuChart?.dispose();
  memoryChart?.dispose();
  instanceChart?.dispose();
  activityChart?.dispose();
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
            <span class="stat-trend">{{ stat.trend }}</span>
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

      <!-- Weekly Activity -->
      <CardPanel class="chart-card">
        <template #title>
          <ThunderboltOutlined /> Weekly Activity
        </template>
        <template #body>
          <div ref="activityChartRef" class="chart"></div>
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

      <!-- Recent Activity -->
      <CardPanel class="activity-card">
        <template #title>
          <CheckCircleOutlined /> Recent Activity
        </template>
        <template #body>
          <div class="activity-list">
            <div
              v-for="(activity, index) in recentActivity"
              :key="index"
              class="activity-item"
            >
              <div class="activity-dot" :class="activity.status"></div>
              <div class="activity-content">
                <div class="activity-main">
                  <strong>{{ activity.name }}</strong> {{ activity.action }}
                </div>
                <div class="activity-time">{{ activity.time }}</div>
              </div>
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

.stat-trend {
  font-size: 14px;
  color: #52c41a;
  font-weight: 600;
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

// Activity
.activity-card {
  :deep(.card-panel-content) {
    padding: 24px;
  }
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.activity-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;

  &.success {
    background: #52c41a;
    box-shadow: 0 0 0 4px rgba(82, 196, 26, 0.1);
  }

  &.warning {
    background: #faad14;
    box-shadow: 0 0 0 4px rgba(250, 173, 20, 0.1);
  }

  &.info {
    background: #1890ff;
    box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.1);
  }
}

.activity-content {
  flex: 1;
}

.activity-main {
  font-size: 14px;
  color: var(--text-color);
  margin-bottom: 4px;

  strong {
    color: #FF8C42;
  }
}

.activity-time {
  font-size: 12px;
  color: var(--color-gray-6);
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
