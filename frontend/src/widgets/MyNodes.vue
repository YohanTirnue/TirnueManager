<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { message } from "ant-design-vue";
import {
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons-vue";
import CardPanel from "@/components/CardPanel.vue";
import { getMyOwnedDaemons, createInstanceOnOwnedDaemon } from "@/services/apis/user";
import type { LayoutCard } from "@/types/index";
import { useRouter } from "vue-router";

defineProps<{
  card: LayoutCard;
}>();

const router = useRouter();

const { execute: executeGetMyDaemons, isLoading: loading } = getMyOwnedDaemons();
const { execute: executeCreateInstance } = createInstanceOnOwnedDaemon();

const ownedDaemons = ref<any[]>([]);
const createInstanceModal = ref({
  visible: false,
  daemonId: "",
  daemonName: "",
  instanceLimit: 0,
  currentCount: 0,
  ramLimitMB: 0,
  ramAllocatedMB: 0,
  availableRamMB: 0,
  ramAllocation: 1024, // Default 1GB
  loading: false,
  config: {
    nickname: "",
    startCommand: "",
    stopCommand: "^C",
    cwd: "",
    ie: "utf-8",
    oe: "utf-8",
    fileCode: "utf-8",
    processType: "general",
    actionCommandList: [] as string[]
  }
});

const loadOwnedDaemons = async () => {
  try {
    const res = await executeGetMyDaemons();
    if (res.value?.success) {
      ownedDaemons.value = res.value.ownedDaemons || [];
    } else {
      message.error(res.value?.error || "Failed to load owned daemons");
    }
  } catch (error: any) {
    message.error(error.message || "Failed to load owned daemons");
  }
};

const showCreateInstanceModal = (daemon: any) => {
  const defaultRam = Math.min(1024, daemon.availableRamMB || 1024); // Default to 1GB or available, whichever is less
  createInstanceModal.value = {
    visible: true,
    daemonId: daemon.daemonId,
    daemonName: daemon.daemonName,
    instanceLimit: daemon.instanceLimit,
    currentCount: daemon.instanceCount,
    ramLimitMB: daemon.ramLimitMB || -1,
    ramAllocatedMB: daemon.ramAllocatedMB || 0,
    availableRamMB: daemon.availableRamMB || 0,
    ramAllocation: defaultRam,
    loading: false,
    config: {
      nickname: "",
      startCommand: "",
      stopCommand: "^C",
      cwd: "",
      ie: "utf-8",
      oe: "utf-8",
      fileCode: "utf-8",
      processType: "general",
      actionCommandList: []
    }
  };
};

const handleCreateInstance = async () => {
  const modal = createInstanceModal.value;

  if (!modal.config.nickname.trim()) {
    message.error("Please enter an instance name");
    return;
  }

  if (!modal.config.startCommand.trim()) {
    message.error("Please enter a start command");
    return;
  }

  if (!modal.ramAllocation || modal.ramAllocation <= 0) {
    message.error("Please specify RAM allocation");
    return;
  }

  if (modal.ramAllocation > modal.availableRamMB) {
    message.error(`Not enough RAM available (${modal.availableRamMB}MB available)`);
    return;
  }

  try {
    modal.loading = true;

    const res = await executeCreateInstance({
      data: {
        daemonId: modal.daemonId,
        config: modal.config,
        ramAllocatedMB: modal.ramAllocation
      }
    });

    if (res.value?.success) {
      message.success("Instance created successfully!");
      modal.visible = false;

      // Reload owned daemons to update instance counts
      await loadOwnedDaemons();

      // Redirect to instances page after a short delay
      setTimeout(() => {
        router.push("/instances");
      }, 1000);
    } else {
      message.error(res.value?.error || "Failed to create instance");
    }
  } catch (error: any) {
    message.error(error.message || "Failed to create instance");
  } finally {
    modal.loading = false;
  }
};

const canCreateMore = computed(() => {
  const modal = createInstanceModal.value;
  return modal.instanceLimit === -1 || modal.currentCount < modal.instanceLimit;
});

const usagePercentage = (daemon: any) => {
  if (daemon.instanceLimit === -1) return 0;
  return (daemon.instanceCount / daemon.instanceLimit) * 100;
};

const getStatusColor = (available: boolean) => {
  return available ? "#52c41a" : "#ff4d4f";
};

onMounted(() => {
  loadOwnedDaemons();
});
</script>

<template>
  <CardPanel :card="card">
    <div class="my-nodes-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <CloudServerOutlined class="page-icon" />
          <div>
            <h1 class="page-title">My Nodes</h1>
            <p class="page-subtitle">
              {{ ownedDaemons.length }} node{{ ownedDaemons.length !== 1 ? 's' : '' }} assigned
            </p>
          </div>
        </div>
        <button class="reload-btn" @click="loadOwnedDaemons" :disabled="loading">
          <ReloadOutlined :spin="loading" />
          Reload
        </button>
      </div>

      <!-- Nodes Grid -->
      <div v-if="ownedDaemons.length > 0" class="nodes-grid">
        <div v-for="daemon in ownedDaemons" :key="daemon.daemonId" class="node-card">
          <!-- Node Header -->
          <div class="node-header">
            <div class="node-icon">
              <CloudServerOutlined />
            </div>
            <div class="node-info">
              <h3 class="node-name">{{ daemon.daemonName }}</h3>
              <div class="node-address">
                {{ daemon.ip }}:{{ daemon.port }}
              </div>
            </div>
            <div class="node-status" :style="{ color: getStatusColor(daemon.available) }">
              <component :is="daemon.available ? CheckCircleOutlined : CloseCircleOutlined" />
              {{ daemon.status }}
            </div>
          </div>

          <!-- Node Stats -->
          <div class="node-stats">
            <div class="stat-card">
              <div class="stat-icon instances">
                <DatabaseOutlined />
              </div>
              <div class="stat-content">
                <div class="stat-label">Instances</div>
                <div class="stat-value">
                  {{ daemon.instanceCount }} / {{ daemon.instanceLimit === -1 ? '∞' : daemon.instanceLimit }}
                </div>
                <div class="stat-progress">
                  <div
                    class="stat-progress-bar"
                    :style="{
                      width: daemon.instanceLimit === -1 ? '0%' : `${usagePercentage(daemon)}%`,
                      background: usagePercentage(daemon) >= 90 ? '#ff4d4f' : '#ff8c00'
                    }"
                  ></div>
                </div>
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-icon ram">
                <DatabaseOutlined />
              </div>
              <div class="stat-content">
                <div class="stat-label">RAM Allocation</div>
                <div class="stat-value">
                  {{ (daemon.ramAllocatedMB / 1024).toFixed(1) }}GB / {{ daemon.ramLimitMB === -1 ? '∞' : (daemon.ramLimitMB / 1024).toFixed(1) + 'GB' }}
                </div>
                <div class="stat-progress">
                  <div
                    class="stat-progress-bar"
                    :style="{
                      width: daemon.ramLimitMB === -1 ? '0%' : `${(daemon.ramAllocatedMB / daemon.ramLimitMB) * 100}%`,
                      background: (daemon.ramAllocatedMB / daemon.ramLimitMB) * 100 >= 90 ? '#ff4d4f' : '#52c41a'
                    }"
                  ></div>
                </div>
                <div class="stat-detail" style="margin-top: 4px;">
                  Available: {{ (daemon.availableRamMB / 1024).toFixed(1) }}GB
                </div>
              </div>
            </div>

            <div v-if="daemon.systemInfo" class="stat-card">
              <div class="stat-icon cpu">
                <ThunderboltOutlined />
              </div>
              <div class="stat-content">
                <div class="stat-label">Node Resources</div>
                <div class="stat-detail">
                  CPU: {{ daemon.systemInfo.cpuUsage?.toFixed(1) || 0 }}%
                </div>
                <div class="stat-detail">
                  RAM: {{ daemon.systemInfo.memUsage?.toFixed(1) || 0 }}%
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="node-actions">
            <button
              class="btn-create-instance"
              @click="showCreateInstanceModal(daemon)"
              :disabled="!daemon.available || (daemon.instanceLimit !== -1 && daemon.instanceCount >= daemon.instanceLimit)"
            >
              <PlusOutlined />
              Create Instance
            </button>
          </div>

          <!-- Warning if limit reached -->
          <div
            v-if="daemon.instanceLimit !== -1 && daemon.instanceCount >= daemon.instanceLimit"
            class="limit-warning"
          >
            Instance limit reached. Contact admin to increase your limit.
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <CloudServerOutlined style="font-size: 64px; color: #d9d9d9; margin-bottom: 16px;" />
        <h3>No Nodes Assigned</h3>
        <p>You don't have any nodes assigned yet.</p>
        <p class="empty-hint">Contact your administrator to get access to nodes.</p>
      </div>
    </div>

    <!-- Create Instance Modal -->
    <a-modal
      v-model:open="createInstanceModal.visible"
      title="Create Instance"
      centered
      :destroy-on-close="true"
      :width="700"
      class="create-instance-modal"
      @cancel="createInstanceModal.visible = false"
    >
      <div class="modal-content">
        <div class="modal-info">
          <div class="info-item">
            <span class="info-label">Node:</span>
            <span class="info-value">{{ createInstanceModal.daemonName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Instances:</span>
            <span class="info-value">
              {{ createInstanceModal.currentCount }} / {{ createInstanceModal.instanceLimit === -1 ? '∞' : createInstanceModal.instanceLimit }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Available RAM:</span>
            <span class="info-value" :style="{ color: createInstanceModal.availableRamMB < 1024 ? '#ff4d4f' : '#52c41a' }">
              {{ (createInstanceModal.availableRamMB / 1024).toFixed(1) }}GB
            </span>
          </div>
        </div>

        <a-form layout="vertical" class="instance-form">
          <a-form-item label="Instance Name" required>
            <a-input
              v-model:value="createInstanceModal.config.nickname"
              placeholder="Enter instance name"
              size="large"
            />
          </a-form-item>

          <a-form-item label="RAM Allocation (MB)" required>
            <div class="ram-input-group">
              <a-input-number
                v-model:value="createInstanceModal.ramAllocation"
                :min="128"
                :max="createInstanceModal.availableRamMB"
                :step="256"
                size="large"
                style="flex: 1;"
                placeholder="e.g., 1024 for 1GB"
              />
              <div class="ram-presets">
                <button
                  type="button"
                  v-for="preset in [512, 1024, 2048, 4096]"
                  :key="preset"
                  class="ram-preset-btn"
                  :disabled="preset > createInstanceModal.availableRamMB"
                  @click="createInstanceModal.ramAllocation = preset"
                >
                  {{ (preset / 1024).toFixed(preset >= 1024 ? 0 : 1) }}GB
                </button>
              </div>
            </div>
            <div class="field-hint" style="margin-top: 8px;">
              {{ (createInstanceModal.ramAllocation / 1024).toFixed(1) }}GB will be allocated ({{ createInstanceModal.availableRamMB }}MB available)
            </div>
          </a-form-item>

          <a-form-item label="Start Command" required>
            <a-input
              v-model:value="createInstanceModal.config.startCommand"
              placeholder="e.g., java -jar server.jar"
              size="large"
            />
          </a-form-item>

          <a-form-item label="Stop Command">
            <a-input
              v-model:value="createInstanceModal.config.stopCommand"
              placeholder="Default: ^C"
              size="large"
            />
          </a-form-item>

          <a-form-item label="Working Directory">
            <a-input
              v-model:value="createInstanceModal.config.cwd"
              placeholder="Leave empty for default"
              size="large"
            />
          </a-form-item>

          <a-form-item label="Process Type">
            <a-select v-model:value="createInstanceModal.config.processType" size="large" style="width: 100%">
              <a-select-option value="general">General</a-select-option>
              <a-select-option value="docker">Docker</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </div>

      <template #footer>
        <div class="modal-footer">
          <button class="btn-cancel" @click="createInstanceModal.visible = false">
            Cancel
          </button>
          <button
            class="btn-create"
            @click="handleCreateInstance"
            :disabled="createInstanceModal.loading || !canCreateMore"
          >
            <span v-if="createInstanceModal.loading">Creating...</span>
            <span v-else>Create Instance</span>
          </button>
        </div>
      </template>
    </a-modal>
  </CardPanel>
</template>

<style scoped lang="less">
.my-nodes-page {
  padding: 24px;
  min-height: 500px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .page-icon {
    font-size: 48px;
    color: #ff8c00;
  }

  .page-title {
    font-size: 28px;
    font-weight: 600;
    margin: 0;
    color: var(--color-text-1);
  }

  .page-subtitle {
    font-size: 14px;
    color: var(--color-text-3);
    margin: 4px 0 0;
  }
}

.reload-btn {
  padding: 10px 20px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: #ff8c00;
    color: #ff8c00;
    background: rgba(255, 140, 0, 0.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.nodes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 24px;
}

.node-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #ff8c00;
    box-shadow: 0 8px 24px rgba(255, 140, 0, 0.12);
    transform: translateY(-2px);
  }
}

.node-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border-2);
}

.node-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #ff8c00, #ff9d1f);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  flex-shrink: 0;
}

.node-info {
  flex: 1;

  .node-name {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px;
    color: var(--color-text-1);
  }

  .node-address {
    font-size: 13px;
    color: var(--color-text-3);
    font-family: monospace;
  }
}

.node-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  background: var(--color-bg-1);
  border-radius: 8px;
}

.node-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-1);
  border-radius: 12px;
  border: 1px solid var(--color-border-2);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  flex-shrink: 0;

  &.instances {
    background: linear-gradient(135deg, #4096ff, #1677ff);
  }

  &.ram {
    background: linear-gradient(135deg, #52c41a, #389e0d);
  }

  &.cpu {
    background: linear-gradient(135deg, #ff8c00, #ff9d1f);
  }
}

.stat-content {
  flex: 1;

  .stat-label {
    font-size: 12px;
    color: var(--color-text-3);
    margin-bottom: 4px;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-1);
    margin-bottom: 8px;
  }

  .stat-detail {
    font-size: 12px;
    color: var(--color-text-2);
    margin-bottom: 2px;
  }
}

.stat-progress {
  height: 6px;
  background: var(--color-bg-3);
  border-radius: 3px;
  overflow: hidden;
}

.stat-progress-bar {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 3px;
}

.node-actions {
  display: flex;
  gap: 12px;
}

.btn-create-instance {
  flex: 1;
  padding: 12px 24px;
  background: linear-gradient(135deg, #ff8c00, #ff9d1f);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(255, 140, 0, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.limit-warning {
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 8px;
  color: #ff4d4f;
  font-size: 13px;
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 80px 24px;
  color: var(--color-text-3);

  h3 {
    font-size: 20px;
    margin: 0 0 8px;
    color: var(--color-text-2);
  }

  p {
    margin: 4px 0;
    font-size: 14px;
  }

  .empty-hint {
    font-size: 13px;
    color: var(--color-text-4);
    margin-top: 12px;
  }
}

// Modal Styles
.create-instance-modal {
  .modal-content {
    padding: 16px 0;
  }

  .modal-info {
    display: flex;
    gap: 24px;
    padding: 16px;
    background: var(--color-bg-1);
    border-radius: 8px;
    margin-bottom: 24px;

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .info-label {
        font-size: 13px;
        color: var(--color-text-3);
      }

      .info-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-1);
      }
    }
  }

  .instance-form {
    :deep(.ant-form-item-label > label) {
      font-weight: 500;
    }
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    justify-content: flex-end;

    button {
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-cancel {
      background: var(--color-bg-2);
      border: 1px solid var(--color-border-2);
      color: var(--color-text-1);

      &:hover {
        border-color: var(--color-border-3);
        background: var(--color-bg-3);
      }
    }

    .btn-create {
      background: #ff8c00;
      border: none;
      color: white;

      &:hover:not(:disabled) {
        background: #ff9d1f;
        box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  // RAM Input Group
  .ram-input-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ram-presets {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ram-preset-btn {
    padding: 8px 16px;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      border-color: #52c41a;
      color: #52c41a;
      background: rgba(82, 196, 26, 0.05);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .field-hint {
    font-size: 12px;
    color: var(--color-text-3);
  }
}
</style>
