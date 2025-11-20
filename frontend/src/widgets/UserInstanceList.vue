<script setup lang="ts">
import { t } from "@/lang/i18n";
import { onMounted, ref, computed } from "vue";
import type { LayoutCard } from "@/types";
import { userInfoApi } from "@/services/apis/index";
import { useRouter } from "vue-router";
import { INSTANCE_STATUS, INSTANCE_STATUS_CODE } from "@/types/const";
import { parseTimestamp } from "../tools/time";
import PermissionBanner from "@/components/PermissionBanner.vue";
import SubUserManager from "@/components/SubUserManager.vue";
import { useAppStateStore } from "@/stores/useAppStateStore";
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
  ReloadOutlined
} from "@ant-design/icons-vue";

defineProps<{
  card: LayoutCard;
}>();

const router = useRouter();
const appStateStore = useAppStateStore();
const loading = ref(false);

const { execute, state } = userInfoApi();
const subUserManagerVisible = ref(false);
const selectedInstance = ref({ daemonId: "", instanceUuid: "" });

const getInstanceList = async () => {
  loading.value = true;
  try {
    await execute({
      params: {
        advanced: true
      }
    });
  } finally {
    loading.value = false;
  }
};

const operate = (daemonId: string, instanceId: string) => {
  router.push({
    path: "/instances/terminal",
    query: {
      daemonId,
      instanceId
    }
  });
};

const openSubUserManager = (daemonId: string, instanceUuid: string) => {
  selectedInstance.value = { daemonId, instanceUuid };
  subUserManagerVisible.value = true;
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

const getServerIcon = (type: string) => {
  // Return appropriate icon based on server type
  if (type?.toLowerCase().includes('minecraft')) return RocketOutlined;
  if (type?.toLowerCase().includes('docker')) return DatabaseOutlined;
  return CloudServerOutlined;
};

const instanceCount = computed(() => state.value?.instances?.length || 0);
const runningCount = computed(() =>
  state.value?.instances?.filter((i: any) => i.status === INSTANCE_STATUS_CODE.RUNNING).length || 0
);

onMounted(() => {
  getInstanceList();
});
</script>

<template>
  <CardPanel class="modern-applications-panel">
    <template #title>
      <div class="panel-header">
        <span class="panel-title">{{ card.title }}</span>
        <div class="header-stats">
          <span class="stat-badge">
            <GlobalOutlined />
            {{ instanceCount }} {{ instanceCount === 1 ? 'Server' : 'Servers' }}
          </span>
          <span class="stat-badge running">
            <ThunderboltOutlined />
            {{ runningCount }} Running
          </span>
        </div>
      </div>
    </template>
    <template #operator>
      <a-button type="text" :loading="loading" @click="getInstanceList">
        <ReloadOutlined />
      </a-button>
    </template>
    <template #body>
      <PermissionBanner type="instance" theme="orange" />

      <!-- Empty State -->
      <div v-if="!state?.instances?.length && !loading" class="empty-state">
        <CloudServerOutlined class="empty-icon" />
        <h3>No Applications Yet</h3>
        <p>You don't have any server instances assigned to your account.</p>
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="loading-state">
        <a-spin size="large" />
        <p>Loading your applications...</p>
      </div>

      <!-- Server Cards Grid -->
      <div v-else class="servers-grid">
        <div
          v-for="instance in state?.instances"
          :key="instance.instanceUuid"
          class="server-card"
          :class="{ 'is-running': instance.status === INSTANCE_STATUS_CODE.RUNNING }"
        >
          <!-- Card Header with Status -->
          <div class="card-header">
            <div class="server-icon">
              <component :is="getServerIcon(instance.processType)" />
            </div>
            <div class="server-info">
              <h3 class="server-name">{{ instance.nickname || 'Unnamed Server' }}</h3>
              <span class="server-type">{{ instance.processType || 'General' }}</span>
            </div>
            <div class="status-indicator" :style="{ '--status-color': getStatusColor(instance.status) }">
              <span class="status-dot" :class="{ 'pulsing': instance.status === INSTANCE_STATUS_CODE.RUNNING }"></span>
              <span class="status-text">{{ getStatusText(instance.status) }}</span>
            </div>
          </div>

          <!-- Card Body with Stats -->
          <div class="card-body">
            <div class="stat-row">
              <div class="stat-item">
                <ClockCircleOutlined />
                <div class="stat-content">
                  <span class="stat-label">Last Active</span>
                  <span class="stat-value">{{ parseTimestamp(instance.lastDatetime) || 'Never' }}</span>
                </div>
              </div>
              <div class="stat-item">
                <PlayCircleOutlined />
                <div class="stat-content">
                  <span class="stat-label">Expires</span>
                  <span class="stat-value">{{ parseTimestamp(instance.endTime) || 'Never' }}</span>
                </div>
              </div>
            </div>

            <!-- Host Info -->
            <div class="host-info">
              <span class="host-label">Host:</span>
              <span class="host-value">{{ instance.hostIp || 'Unknown' }}</span>
            </div>
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
              Manage
            </a-button>
            <a-button
              v-if="canManageSubUsers()"
              class="action-btn secondary-action"
              @click="openSubUserManager(instance.daemonId, instance.instanceUuid)"
            >
              <TeamOutlined />
              Team
            </a-button>
          </div>

          <!-- Decorative Elements -->
          <div class="card-glow"></div>
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
  background: linear-gradient(135deg, rgba(20, 20, 25, 0.98) 0%, rgba(30, 30, 40, 0.98) 100%);
  border: 1px solid rgba(255, 140, 66, 0.2);
  border-radius: 16px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #fff 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-stats {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);

  &.running {
    background: rgba(82, 196, 26, 0.15);
    color: #52c41a;
  }
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .empty-icon {
    font-size: 64px;
    color: rgba(255, 255, 255, 0.15);
    margin-bottom: 20px;
  }

  h3 {
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 8px;
    font-size: 18px;
  }

  p {
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
  padding: 8px 0;
}

.server-card {
  position: relative;
  background: linear-gradient(145deg, rgba(40, 40, 50, 0.9) 0%, rgba(30, 30, 40, 0.9) 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 140, 66, 0.4);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 140, 66, 0.1);

    .card-glow {
      opacity: 1;
    }
  }

  &.is-running {
    border-color: rgba(82, 196, 26, 0.3);

    &:hover {
      border-color: rgba(82, 196, 26, 0.5);
    }
  }
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 140, 66, 0.6), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.server-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%);
  border-radius: 12px;
  font-size: 24px;
  color: #d4af37;
  flex-shrink: 0;
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

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 20px;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--status-color);

  &.pulsing {
    animation: pulse 2s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 var(--status-color);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 6px transparent;
  }
}

.status-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--status-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-body {
  margin-bottom: 16px;
}

.stat-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;

  > :first-child {
    color: rgba(255, 140, 66, 0.7);
    font-size: 14px;
  }
}

.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.host-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  font-size: 12px;
}

.host-label {
  color: rgba(255, 255, 255, 0.45);
}

.host-value {
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Monaco', 'Menlo', monospace;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;

  &.primary-action {
    background: linear-gradient(135deg, #ff8c42 0%, #d4af37 100%);
    border: none;
    color: #000;

    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #ff9a5c 0%, #e5c04a 100%);
      transform: translateY(-1px);
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
    }
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .servers-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-stats {
    margin-top: 8px;
  }

  .stat-row {
    grid-template-columns: 1fr;
  }
}
</style>
