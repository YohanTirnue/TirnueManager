<script setup lang="ts">
import { t } from "@/lang/i18n";
import { onMounted, ref, computed, watch, nextTick } from "vue";
import type { LayoutCard } from "@/types";
import { userInfoApi } from "@/services/apis/index";
import { useRouter } from "vue-router";
import { INSTANCE_STATUS, INSTANCE_STATUS_CODE } from "@/types/const";
import { parseTimestamp } from "../tools/time";
import PermissionBanner from "@/components/PermissionBanner.vue";
import SubUserManager from "@/components/SubUserManager.vue";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { reportErrorMsg } from "@/tools/validator";
import { message } from "ant-design-vue";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  RocketOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  SortAscendingOutlined,
  CopyOutlined,
  PoweroffOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DesktopOutlined,
  CodeOutlined
} from "@ant-design/icons-vue";
import { openInstance, stopInstance, restartInstance, killInstance } from "@/services/apis/instance";

defineProps<{
  card: LayoutCard;
}>();

const router = useRouter();
const appStateStore = useAppStateStore();
const loading = ref(false);
const searchQuery = ref("");
const viewMode = ref<"grid" | "list">("grid");
const sortBy = ref<"name" | "status" | "lastActive">("name");
const sortOrder = ref<"asc" | "desc">("asc");
const animatedCards = ref<Set<string>>(new Set());

const { execute, state } = userInfoApi();
const { execute: executeOpen } = openInstance();
const { execute: executeStop } = stopInstance();
const { execute: executeRestart } = restartInstance();
const { execute: executeKill } = killInstance();
const subUserManagerVisible = ref(false);
const selectedInstance = ref({ daemonId: "", instanceUuid: "" });
const operatingInstances = ref<Set<string>>(new Set());

const getInstanceList = async () => {
  loading.value = true;
  animatedCards.value.clear();
  try {
    await execute({
      params: {
        advanced: true
      }
    });
    // Stagger animation for cards
    await nextTick();
    filteredInstances.value.forEach((instance: any, index: number) => {
      setTimeout(() => {
        animatedCards.value.add(instance.instanceUuid);
      }, index * 80);
    });
  } finally {
    loading.value = false;
  }
};

const filteredInstances = computed(() => {
  if (!state.value?.instances) return [];

  let instances = [...state.value.instances];

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    instances = instances.filter((i: any) =>
      i.nickname?.toLowerCase().includes(query) ||
      i.processType?.toLowerCase().includes(query) ||
      i.hostIp?.toLowerCase().includes(query)
    );
  }

  // Sort instances
  instances.sort((a: any, b: any) => {
    let comparison = 0;
    switch (sortBy.value) {
      case "name":
        comparison = (a.nickname || "").localeCompare(b.nickname || "");
        break;
      case "status":
        comparison = a.status - b.status;
        break;
      case "lastActive":
        comparison = (a.lastDatetime || 0) - (b.lastDatetime || 0);
        break;
    }
    return sortOrder.value === "asc" ? comparison : -comparison;
  });

  return instances;
});

const operate = (daemonId: string, instanceId: string) => {
  router.push({
    path: "/instances/terminal",
    query: {
      daemonId,
      instanceId
    }
  });
};

const quickAction = async (instance: any, action: "open" | "stop" | "restart" | "kill") => {
  const key = instance.instanceUuid;
  operatingInstances.value.add(key);

  try {
    const params = {
      uuid: instance.instanceUuid,
      daemonId: instance.daemonId
    };

    switch (action) {
      case "open":
        await executeOpen({ params });
        break;
      case "stop":
        await executeStop({ params });
        break;
      case "restart":
        await executeRestart({ params });
        break;
      case "kill":
        await executeKill({ params });
        break;
    }

    message.success(`${action.charAt(0).toUpperCase() + action.slice(1)} command sent`);
    // Refresh list after action
    setTimeout(() => getInstanceList(), 1500);
  } catch (error: any) {
    reportErrorMsg(error.message || `Failed to ${action} instance`);
  } finally {
    operatingInstances.value.delete(key);
  }
};

const openSubUserManager = (daemonId: string, instanceUuid: string) => {
  selectedInstance.value = { daemonId, instanceUuid };
  subUserManagerVisible.value = true;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    message.success("Copied to clipboard");
  } catch {
    message.error("Failed to copy");
  }
};

const canManageSubUsers = () => {
  const userInfo = appStateStore.state.userInfo;
  return userInfo && !userInfo.isSubUser && (userInfo.permission === 10 || userInfo.permission === 1);
};

const getStatusColor = (status: INSTANCE_STATUS_CODE) => {
  switch (status) {
    case INSTANCE_STATUS_CODE.RUNNING:
      return '#52c41a';
    case INSTANCE_STATUS_CODE.STOPPED:
      return '#ff4d4f';
    case INSTANCE_STATUS_CODE.STOPPING:
      return '#faad14';
    case INSTANCE_STATUS_CODE.STARTING:
      return '#1890ff';
    default:
      return '#8c8c8c';
  }
};

const getStatusText = (status: INSTANCE_STATUS_CODE) => {
  return INSTANCE_STATUS[status] || 'Unknown';
};

const getStatusIcon = (status: INSTANCE_STATUS_CODE) => {
  switch (status) {
    case INSTANCE_STATUS_CODE.RUNNING:
      return CheckCircleOutlined;
    case INSTANCE_STATUS_CODE.STOPPED:
      return CloseCircleOutlined;
    case INSTANCE_STATUS_CODE.STOPPING:
    case INSTANCE_STATUS_CODE.STARTING:
      return LoadingOutlined;
    default:
      return ExclamationCircleOutlined;
  }
};

const getServerIcon = (type?: string) => {
  const typeLower = type?.toLowerCase() || '';
  if (typeLower.includes('minecraft')) return RocketOutlined;
  if (typeLower.includes('docker')) return DatabaseOutlined;
  if (typeLower.includes('steam') || typeLower.includes('game')) return DesktopOutlined;
  if (typeLower.includes('node') || typeLower.includes('python')) return CodeOutlined;
  return CloudServerOutlined;
};

const getServerTypeColor = (type?: string) => {
  const typeLower = type?.toLowerCase() || '';
  if (typeLower.includes('minecraft')) return { bg: 'rgba(139, 195, 74, 0.15)', color: '#8bc34a' };
  if (typeLower.includes('docker')) return { bg: 'rgba(33, 150, 243, 0.15)', color: '#2196f3' };
  if (typeLower.includes('steam')) return { bg: 'rgba(156, 39, 176, 0.15)', color: '#9c27b0' };
  return { bg: 'rgba(255, 140, 66, 0.15)', color: '#ff8c42' };
};

const canStart = (status: INSTANCE_STATUS_CODE) => {
  return status === INSTANCE_STATUS_CODE.STOPPED;
};

const canStop = (status: INSTANCE_STATUS_CODE) => {
  return status === INSTANCE_STATUS_CODE.RUNNING;
};

const instanceCount = computed(() => state.value?.instances?.length || 0);
const runningCount = computed(() =>
  state.value?.instances?.filter((i: any) => i.status === INSTANCE_STATUS_CODE.RUNNING).length || 0
);
const stoppedCount = computed(() =>
  state.value?.instances?.filter((i: any) => i.status === INSTANCE_STATUS_CODE.STOPPED).length || 0
);

const toggleSort = (field: "name" | "status" | "lastActive") => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = field;
    sortOrder.value = "asc";
  }
};

// Watch for search changes to re-animate
watch(searchQuery, async () => {
  animatedCards.value.clear();
  await nextTick();
  filteredInstances.value.forEach((instance: any, index: number) => {
    setTimeout(() => {
      animatedCards.value.add(instance.instanceUuid);
    }, index * 50);
  });
});

onMounted(() => {
  getInstanceList();
});
</script>

<template>
  <CardPanel class="modern-applications-panel">
    <template #title>
      <div class="panel-header">
        <div class="title-section">
          <span class="panel-title">{{ card.title }}</span>
          <div class="title-decoration"></div>
        </div>
      </div>
    </template>
    <template #operator>
      <a-button type="text" :loading="loading" @click="getInstanceList">
        <ReloadOutlined :class="{ 'spin': loading }" />
      </a-button>
    </template>
    <template #body>
      <PermissionBanner type="instance" theme="orange" />

      <!-- Stats Overview -->
      <div class="stats-overview">
        <div class="stat-card total">
          <div class="stat-icon">
            <GlobalOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ instanceCount }}</span>
            <span class="stat-label">Total Servers</span>
          </div>
        </div>
        <div class="stat-card running">
          <div class="stat-icon">
            <ThunderboltOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ runningCount }}</span>
            <span class="stat-label">Running</span>
          </div>
        </div>
        <div class="stat-card stopped">
          <div class="stat-icon">
            <PauseCircleOutlined />
          </div>
          <div class="stat-info">
            <span class="stat-number">{{ stoppedCount }}</span>
            <span class="stat-label">Stopped</span>
          </div>
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="controls-bar">
        <div class="search-box">
          <SearchOutlined class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search servers..."
            class="search-input"
          />
        </div>

        <div class="control-actions">
          <div class="sort-dropdown">
            <a-dropdown :trigger="['click']">
              <a-button class="control-btn">
                <SortAscendingOutlined />
                Sort
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="toggleSort('name')">
                    <span :class="{ active: sortBy === 'name' }">Name {{ sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}</span>
                  </a-menu-item>
                  <a-menu-item @click="toggleSort('status')">
                    <span :class="{ active: sortBy === 'status' }">Status {{ sortBy === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}</span>
                  </a-menu-item>
                  <a-menu-item @click="toggleSort('lastActive')">
                    <span :class="{ active: sortBy === 'lastActive' }">Last Active {{ sortBy === 'lastActive' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}</span>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>

          <div class="view-toggle">
            <button
              class="toggle-btn"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              <AppstoreOutlined />
            </button>
            <button
              class="toggle-btn"
              :class="{ active: viewMode === 'list' }"
              @click="viewMode = 'list'"
            >
              <UnorderedListOutlined />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!filteredInstances.length && !loading" class="empty-state">
        <div class="empty-illustration">
          <CloudServerOutlined class="empty-icon" />
          <div class="empty-circles">
            <div class="circle c1"></div>
            <div class="circle c2"></div>
            <div class="circle c3"></div>
          </div>
        </div>
        <h3>{{ searchQuery ? 'No Results Found' : 'No Applications Yet' }}</h3>
        <p>{{ searchQuery ? 'Try adjusting your search terms' : "You don't have any server instances assigned to your account." }}</p>
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="loading-state">
        <div class="loading-spinner">
          <div class="spinner"></div>
        </div>
        <p>Loading your applications...</p>
      </div>

      <!-- Server Cards Grid -->
      <div v-else :class="['servers-container', viewMode]">
        <div
          v-for="(instance, index) in filteredInstances"
          :key="instance.instanceUuid"
          :class="[
            'server-card',
            viewMode,
            {
              'is-running': instance.status === INSTANCE_STATUS_CODE.RUNNING,
              'animated': animatedCards.has(instance.instanceUuid)
            }
          ]"
          :style="{ '--animation-delay': `${index * 0.08}s` }"
        >
          <!-- Card Background Pattern -->
          <div class="card-pattern"></div>

          <!-- Card Header with Status -->
          <div class="card-header">
            <div class="server-icon" :style="{
              background: getServerTypeColor(instance.processType).bg,
              color: getServerTypeColor(instance.processType).color
            }">
              <component :is="getServerIcon(instance.processType)" />
            </div>
            <div class="server-info">
              <h3 class="server-name">{{ instance.nickname || 'Unnamed Server' }}</h3>
              <span class="server-type">{{ instance.processType || 'General' }}</span>
            </div>
            <div class="status-badge" :style="{ '--status-color': getStatusColor(instance.status) }">
              <component :is="getStatusIcon(instance.status)" :class="{ 'spin': instance.status === INSTANCE_STATUS_CODE.STARTING || instance.status === INSTANCE_STATUS_CODE.STOPPING }" />
              <span class="status-text">{{ getStatusText(instance.status) }}</span>
            </div>
          </div>

          <!-- Card Body with Stats -->
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <ClockCircleOutlined class="info-icon" />
                <div class="info-content">
                  <span class="info-label">Last Active</span>
                  <span class="info-value">{{ parseTimestamp(instance.lastDatetime) || 'Never' }}</span>
                </div>
              </div>
              <div class="info-item">
                <PlayCircleOutlined class="info-icon" />
                <div class="info-content">
                  <span class="info-label">Expires</span>
                  <span class="info-value" :class="{ 'warning': instance.endTime && instance.endTime < Date.now() + 86400000 * 7 }">
                    {{ parseTimestamp(instance.endTime) || 'Never' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Host Info with Copy -->
            <div class="host-info" @click="copyToClipboard(instance.hostIp || 'Unknown')">
              <GlobalOutlined class="host-icon" />
              <span class="host-value">{{ instance.hostIp || 'Unknown' }}</span>
              <CopyOutlined class="copy-icon" />
              <span class="copy-hint">Click to copy</span>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <a-tooltip v-if="canStart(instance.status)" title="Start Server">
              <button
                class="quick-btn start"
                :disabled="operatingInstances.has(instance.instanceUuid)"
                @click.stop="quickAction(instance, 'open')"
              >
                <CaretRightOutlined v-if="!operatingInstances.has(instance.instanceUuid)" />
                <LoadingOutlined v-else class="spin" />
              </button>
            </a-tooltip>
            <a-tooltip v-if="canStop(instance.status)" title="Stop Server">
              <button
                class="quick-btn stop"
                :disabled="operatingInstances.has(instance.instanceUuid)"
                @click.stop="quickAction(instance, 'stop')"
              >
                <PoweroffOutlined v-if="!operatingInstances.has(instance.instanceUuid)" />
                <LoadingOutlined v-else class="spin" />
              </button>
            </a-tooltip>
          </div>

          <!-- Card Actions -->
          <div class="card-actions">
            <a-button
              type="primary"
              class="action-btn primary-action"
              :disabled="instance.status === INSTANCE_STATUS_CODE.BUSY"
              @click="operate(instance.daemonId, instance.instanceUuid)"
            >
              <SettingOutlined />
              <span>Manage</span>
            </a-button>
            <a-button
              v-if="canManageSubUsers()"
              class="action-btn secondary-action"
              @click="openSubUserManager(instance.daemonId, instance.instanceUuid)"
            >
              <TeamOutlined />
              <span>Team</span>
            </a-button>
          </div>

          <!-- Decorative Elements -->
          <div class="card-glow"></div>
          <div class="card-shine"></div>
        </div>
      </div>
    </template>
  </CardPanel>

  <!-- Sub-User Manager Modal -->
  <SubUserManager
    v-model:visible="subUserManagerVisible"
    :daemon-id="selectedInstance.daemonId"
    :instance-uuid="selectedInstance.instanceUuid"
    @refresh="getInstanceList"
  />
</template>

<style lang="scss" scoped>
.modern-applications-panel {
  background: linear-gradient(145deg, rgba(18, 18, 24, 0.98) 0%, rgba(26, 26, 36, 0.98) 100%);
  border: 1px solid rgba(255, 140, 66, 0.15);
  border-radius: 20px;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 140, 66, 0.5), transparent);
  }
}

.panel-header {
  display: flex;
  align-items: center;
  width: 100%;
}

.title-section {
  position: relative;
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #d4af37 50%, #ff8c42 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

.title-decoration {
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #ff8c42, #d4af37);
  border-radius: 2px;
}

// Stats Overview
.stats-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }

  .stat-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    font-size: 20px;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-number {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }

  .stat-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 4px;
  }

  &.total {
    .stat-icon {
      background: rgba(255, 140, 66, 0.15);
      color: #ff8c42;
    }
    .stat-number { color: #ff8c42; }
  }

  &.running {
    .stat-icon {
      background: rgba(82, 196, 26, 0.15);
      color: #52c41a;
    }
    .stat-number { color: #52c41a; }
  }

  &.stopped {
    .stat-icon {
      background: rgba(255, 77, 79, 0.15);
      color: #ff4d4f;
    }
    .stat-number { color: #ff4d4f; }
  }
}

// Controls Bar
.controls-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 320px;

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.3);
    font-size: 14px;
  }

  .search-input {
    width: 100%;
    padding: 8px 12px 8px 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    transition: all 0.2s ease;

    &::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    &:focus {
      outline: none;
      border-color: rgba(255, 140, 66, 0.5);
      background: rgba(255, 255, 255, 0.08);
    }
  }
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
}

.view-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  padding: 2px;

  .toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      color: rgba(255, 255, 255, 0.7);
    }

    &.active {
      background: rgba(255, 140, 66, 0.2);
      color: #ff8c42;
    }
  }
}

// Empty & Loading States
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-illustration {
  position: relative;
  margin-bottom: 24px;

  .empty-icon {
    font-size: 72px;
    color: rgba(255, 140, 66, 0.3);
    position: relative;
    z-index: 1;
  }

  .empty-circles {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    .circle {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(255, 140, 66, 0.1);

      &.c1 {
        width: 100px;
        height: 100px;
        top: -50px;
        left: -50px;
        animation: pulse-ring 3s ease-in-out infinite;
      }

      &.c2 {
        width: 140px;
        height: 140px;
        top: -70px;
        left: -70px;
        animation: pulse-ring 3s ease-in-out infinite 0.5s;
      }

      &.c3 {
        width: 180px;
        height: 180px;
        top: -90px;
        left: -90px;
        animation: pulse-ring 3s ease-in-out infinite 1s;
      }
    }
  }
}

@keyframes pulse-ring {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.1;
    transform: scale(1.1);
  }
}

.empty-state h3 {
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.empty-state p,
.loading-state p {
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  font-size: 14px;
}

.loading-spinner {
  margin-bottom: 20px;

  .spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(255, 140, 66, 0.1);
    border-top-color: #ff8c42;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}

// Servers Container
.servers-container {
  &.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 20px;
  }

  &.list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

// Server Card
.server-card {
  position: relative;
  background: linear-gradient(145deg, rgba(35, 35, 45, 0.9) 0%, rgba(25, 25, 35, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  overflow: hidden;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &.animated {
    opacity: 1;
    transform: translateY(0);
  }

  &:hover {
    border-color: rgba(255, 140, 66, 0.3);
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.4),
      0 0 0 1px rgba(255, 140, 66, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transform: translateY(-4px);

    .card-glow {
      opacity: 1;
    }

    .card-shine {
      transform: translateX(100%);
    }

    .quick-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }

  &.is-running {
    border-color: rgba(82, 196, 26, 0.2);

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(ellipse at top right, rgba(82, 196, 26, 0.05) 0%, transparent 50%);
      pointer-events: none;
    }
  }

  // List view adjustments
  &.list {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;

    .card-header {
      margin: 0;
    }

    .card-body {
      margin: 0;

      .info-grid {
        display: flex;
        gap: 24px;
      }

      .host-info {
        display: none;
      }
    }

    .quick-actions {
      position: static;
      opacity: 1;
      transform: none;
      flex-direction: row;
    }

    .card-actions {
      margin: 0;
    }
  }
}

.card-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(255, 140, 66, 0.03) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 50%);
  pointer-events: none;
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 140, 66, 0.6), rgba(212, 175, 55, 0.6), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
  transition: transform 0.6s ease;
  pointer-events: none;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  position: relative;
}

.server-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 26px;
  flex-shrink: 0;
  transition: transform 0.3s ease;

  .server-card:hover & {
    transform: scale(1.05);
  }
}

.server-info {
  flex: 1;
  min-width: 0;
}

.server-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.server-type {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: capitalize;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--status-color);

  .anticon {
    font-size: 12px;
  }
}

.status-text {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-body {
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;

  .info-icon {
    color: rgba(255, 140, 66, 0.6);
    font-size: 14px;
  }
}

.info-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.info-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.warning {
    color: #faad14;
  }
}

.host-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.25);

    .copy-icon {
      opacity: 1;
    }

    .copy-hint {
      opacity: 1;
    }
  }

  .host-icon {
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
  }

  .host-value {
    flex: 1;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
  }

  .copy-icon {
    color: rgba(255, 140, 66, 0.7);
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .copy-hint {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
}

// Quick Actions
.quick-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s ease;
}

.quick-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &.start {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;

    &:hover:not(:disabled) {
      background: rgba(82, 196, 26, 0.25);
      transform: scale(1.1);
    }
  }

  &.stop {
    background: rgba(255, 77, 79, 0.15);
    color: #ff4d4f;

    &:hover:not(:disabled) {
      background: rgba(255, 77, 79, 0.25);
      transform: scale(1.1);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// Card Actions
.card-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;

  &.primary-action {
    background: linear-gradient(135deg, #ff8c42 0%, #d4af37 100%);
    border: none;
    color: #000;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #ff9a5c 0%, #e5c04a 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &.secondary-action {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.85);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .stats-overview {
    grid-template-columns: 1fr;
  }

  .servers-container.grid {
    grid-template-columns: 1fr;
  }

  .controls-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .control-actions {
    justify-content: space-between;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
