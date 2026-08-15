<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { message } from "ant-design-vue";
import {
  CloudServerOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons-vue";
import CardPanel from "@/components/CardPanel.vue";
import AppPackages from "@/widgets/setupApp/AppPackagesModern.vue";
import { getMyOwnedDaemons, createInstanceOnOwnedDaemon } from "@/services/apis/user";
import type { LayoutCard, QuickStartPackages } from "@/types/index";
import { useRouter } from "vue-router";

defineProps<{
  card: LayoutCard;
}>();

const router = useRouter();

const { execute: executeGetMyDaemons, isLoading: loading } = getMyOwnedDaemons();
const { execute: executeCreateInstance } = createInstanceOnOwnedDaemon();

const ownedDaemons = ref<any[]>([]);

// Template market modal state
const templateMarketModal = ref({
  visible: false,
  daemonId: "",
  daemonName: "",
  instanceLimit: 0,
  currentCount: 0,
  ramLimitMB: 0,
  ramAllocatedMB: 0,
  availableRamMB: 0
});
const appPackagesRef = ref<InstanceType<typeof AppPackages>>();
const selectedTemplate = ref<QuickStartPackages | null>(null);

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
  baseStartCommand: "", // Store original template start command
  config: {
    nickname: "",
    startCommand: "",
    stopCommand: "^C",
    cwd: "",
    ie: "utf-8",
    oe: "utf-8",
    fileCode: "utf-8",
    processType: "docker",
    actionCommandList: [] as string[],
    docker: {
      image: "",
      ports: [] as string[],
      extraVolumes: [] as string[]
    }
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

const showCreateInstanceModal = async (daemon: any) => {
  // Reload daemon data to get fresh RAM info before showing template market
  await loadOwnedDaemons();

  // Find the refreshed daemon data
  const refreshedDaemon = ownedDaemons.value.find(d => d.daemonId === daemon.daemonId) || daemon;

  // First show template market
  templateMarketModal.value = {
    visible: true,
    daemonId: refreshedDaemon.daemonId,
    daemonName: refreshedDaemon.daemonName,
    instanceLimit: refreshedDaemon.instanceLimit,
    currentCount: refreshedDaemon.instanceCount,
    ramLimitMB: refreshedDaemon.ramLimitMB || -1,
    ramAllocatedMB: refreshedDaemon.ramAllocatedMB || 0,
    availableRamMB: refreshedDaemon.availableRamMB || 0
  };
  selectedTemplate.value = null;
  appPackagesRef.value?.init();
};

// Helper function to adjust -Xmx and -Xms in start command based on RAM
const adjustJavaMemoryInCommand = (command: string, ramMB: number): string => {
  if (!command) return command;

  // Leave some headroom for the JVM itself (typically 10-20% overhead)
  // For containers, use 80% of allocated RAM for heap
  const heapMB = Math.floor(ramMB * 0.8);
  const heapG = (heapMB / 1024).toFixed(1);

  // Replace -Xmx and -Xms with the calculated values
  // Supports formats: -Xmx2G, -Xmx2048M, -Xmx2g, -Xmx2048m
  let updatedCommand = command
    .replace(/-Xmx\d+[GgMm]/g, `-Xmx${heapG}G`)
    .replace(/-Xms\d+[GgMm]/g, `-Xms${heapG}G`);

  return updatedCommand;
};

const handleSelectTemplate = (template: QuickStartPackages | null) => {
  if (!template) {
    templateMarketModal.value.visible = false;
    return;
  }

  selectedTemplate.value = template;
  templateMarketModal.value.visible = false;

  // Now show RAM allocation modal with template pre-filled
  const modal = templateMarketModal.value;
  const defaultRam = Math.min(1024, modal.availableRamMB || 1024);

  // Get start command from template
  const setupInfo = template.setupInfo;
  let baseStartCommand = "";
  if (setupInfo?.startCommand) {
    baseStartCommand = setupInfo.startCommand;
  } else if (setupInfo?.docker?.command) {
    baseStartCommand = setupInfo.docker.command;
  } else if (setupInfo?.command) {
    baseStartCommand = setupInfo.command;
  }

  // Adjust Java memory parameters in start command based on default RAM
  const adjustedStartCommand = adjustJavaMemoryInCommand(baseStartCommand, defaultRam);

  createInstanceModal.value = {
    visible: true,
    daemonId: modal.daemonId,
    daemonName: modal.daemonName,
    instanceLimit: modal.instanceLimit,
    currentCount: modal.currentCount,
    ramLimitMB: modal.ramLimitMB,
    ramAllocatedMB: modal.ramAllocatedMB,
    availableRamMB: modal.availableRamMB,
    ramAllocation: defaultRam,
    loading: false,
    baseStartCommand: baseStartCommand, // Store the original template command
    config: {
      nickname: template.title || "",
      startCommand: adjustedStartCommand,
      stopCommand: setupInfo?.stopCommand || "^C",
      cwd: setupInfo?.cwd || "",
      ie: "utf-8",
      oe: "utf-8",
      fileCode: "utf-8",
      processType: "docker",
      actionCommandList: [],
      docker: {
        image: setupInfo?.docker?.image || "eclipse-temurin:21-jre",
        ports: setupInfo?.docker?.ports || ["25565:25565/tcp"],
        extraVolumes: setupInfo?.docker?.extraVolumes || []
      }
    }
  };
};

const goBackToTemplateMarket = () => {
  createInstanceModal.value.visible = false;
  templateMarketModal.value.visible = true;
  appPackagesRef.value?.init();
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

// Watch RAM allocation changes and update start command accordingly
watch(
  () => createInstanceModal.value.ramAllocation,
  (newRam) => {
    // Only adjust if we have a base command to work with
    if (createInstanceModal.value.baseStartCommand) {
      createInstanceModal.value.config.startCommand = adjustJavaMemoryInCommand(
        createInstanceModal.value.baseStartCommand,
        newRam
      );
    }
  }
);

onMounted(() => {
  loadOwnedDaemons();
});
</script>

<template>
  <CardPanel :card="card">
    <template #body>
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
                      background: usagePercentage(daemon) >= 90 ? '#ff4d4f' : 'var(--theme-primary-color)'
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
                  {{ ((daemon.ramAllocatedMB || 0) / 1024).toFixed(1) }}GB / {{ daemon.ramLimitMB === -1 || !daemon.ramLimitMB ? '∞' : ((daemon.ramLimitMB || 0) / 1024).toFixed(1) + 'GB' }}
                </div>
                <div class="stat-progress">
                  <div
                    class="stat-progress-bar"
                    :style="{
                      width: daemon.ramLimitMB === -1 || !daemon.ramLimitMB ? '0%' : `${((daemon.ramAllocatedMB || 0) / daemon.ramLimitMB) * 100}%`,
                      background: daemon.ramLimitMB && ((daemon.ramAllocatedMB || 0) / daemon.ramLimitMB) * 100 >= 90 ? '#ff4d4f' : '#52c41a'
                    }"
                  ></div>
                </div>
                <div class="stat-detail" style="margin-top: 4px;">
                  Available: {{ ((daemon.availableRamMB || 0) / 1024).toFixed(1) }}GB
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

    <!-- Template Market Modal -->
    <a-modal
      v-model:open="templateMarketModal.visible"
      centered
      width="1600px"
      :footer="null"
      :mask-closable="false"
      @cancel="templateMarketModal.visible = false"
    >
      <AppPackages
        ref="appPackagesRef"
        btn-text="Select"
        title="Select Server Template"
        :show-custom-btn="false"
        :only-docker-template="true"
        :hide-create-button="true"
        @handle-select-template="handleSelectTemplate"
      />
    </a-modal>

    <!-- Create Instance Modal (RAM Allocation) -->
    <a-modal
      v-model:open="createInstanceModal.visible"
      centered
      :destroy-on-close="true"
      :width="700"
      class="create-instance-modal"
      @cancel="createInstanceModal.visible = false"
    >
      <template #title>
        <div class="modal-title-with-back">
          <button class="back-btn" @click="goBackToTemplateMarket">
            <ArrowLeftOutlined />
          </button>
          <span>Configure Instance - {{ selectedTemplate?.title || 'New Instance' }}</span>
        </div>
      </template>
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

          <!-- Hidden fields - auto-filled from template -->
          <!-- Start command, stop command, and working directory are automatically set from the template -->

          <div class="template-info" style="background: var(--color-bg-2); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
            <div style="font-size: 13px; color: var(--color-text-3); margin-bottom: 8px;">
              Template Configuration
            </div>
            <div style="font-size: 12px; color: var(--color-text-4);">
              <div v-if="createInstanceModal.config.startCommand">
                <strong>Start:</strong> {{ createInstanceModal.config.startCommand }}
              </div>
              <div v-if="createInstanceModal.config.stopCommand">
                <strong>Stop:</strong> {{ createInstanceModal.config.stopCommand }}
              </div>
              <div v-if="createInstanceModal.config.cwd">
                <strong>Directory:</strong> {{ createInstanceModal.config.cwd }}
              </div>
            </div>
          </div>
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
    </template>
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
    color: var(--theme-primary-color);
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
    border-color: var(--theme-primary-color);
    color: var(--theme-primary-color);
    background: var(--theme-shadow-hover);
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
    border-color: var(--theme-primary-color);
    box-shadow: 0 8px 24px var(--theme-shadow-hover);
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
  background: var(--theme-primary-gradient);
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
    background: var(--theme-primary-gradient);
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
  background: var(--theme-primary-gradient);
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
    box-shadow: 0 6px 16px var(--theme-shadow-hover);
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
      background: var(--theme-primary-color);
      border: none;
      color: white;

      &:hover:not(:disabled) {
        background: var(--theme-primary-color);
        box-shadow: 0 4px 12px var(--theme-shadow-hover);
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

// Modal title with back button
.modal-title-with-back {
  display: flex;
  align-items: center;
  gap: 12px;

  .back-btn {
    padding: 6px 10px;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: var(--color-text-2);

    &:hover {
      border-color: var(--theme-primary-color);
      color: var(--theme-primary-color);
      background: var(--theme-shadow-hover);
    }
  }

  span {
    font-weight: 600;
    font-size: 16px;
  }
}
</style>
