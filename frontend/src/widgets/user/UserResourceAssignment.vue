<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { message, Modal } from "ant-design-vue";
import {
  DatabaseOutlined,
  CloudServerOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
  UserOutlined,
  IdcardOutlined
} from "@ant-design/icons-vue";
import CardPanel from "@/components/CardPanel.vue";
import { remoteNodeList, remoteInstances, userInfoApiAdvanced, updateUserInstance } from "@/services/apis";
import {
  assignOwnedDaemon,
  updateOwnedDaemonLimit,
  removeOwnedDaemon
} from "@/services/apis/user";
import type { LayoutCard } from "@/types/index";
import { useRoute, useRouter } from "vue-router";

defineProps<{
  card: LayoutCard;
}>();

const route = useRoute();
const router = useRouter();
const userUuid = ref(route.query.uuid as string);

// User Data
const userData = ref<any>(null);
const loading = ref(false);

// Daemon/Node Assignment
const availableDaemons = ref<any[]>([]);
const ownedDaemonModal = ref({
  visible: false,
  mode: "add" as "add" | "edit",
  daemonId: "",
  instanceLimit: -1,
  ramLimitMB: -1,
  loading: false
});

// Instance Assignment
const availableInstances = ref<any[]>([]);
const instanceModal = ref({
  visible: false,
  selectedDaemon: "",
  selectedInstance: "",
  ramAllocatedMB: 1024,
  maxSubUsers: 3,
  loading: false,
  loadingInstances: false
});

const { execute: executeGetUser } = userInfoApiAdvanced();
const { execute: executeRemoteNodeList } = remoteNodeList();
const { execute: executeGetInstances } = remoteInstances();
const { execute: executeUpdateUserInstance } = updateUserInstance();
const { execute: executeAssignDaemon } = assignOwnedDaemon();
const { execute: executeUpdateLimit } = updateOwnedDaemonLimit();
const { execute: executeRemoveDaemon } = removeOwnedDaemon();

const loadUserData = async () => {
  if (!userUuid.value) {
    message.error("No user UUID provided");
    router.push("/users");
    return;
  }

  try {
    loading.value = true;
    const res = await executeGetUser({
      params: {
        uuid: userUuid.value,
        advanced: true
      }
    });
    if (res.value) {
      userData.value = res.value;
    } else {
      message.error("Failed to load user data");
    }
  } catch (error: any) {
    message.error(error.message || "Failed to load user data");
  } finally {
    loading.value = false;
  }
};

const loadAvailableDaemons = async () => {
  try {
    const res = await executeRemoteNodeList();
    availableDaemons.value = res.value || [];
  } catch (error: any) {
    message.error("Failed to load daemons: " + error.message);
  }
};

// === Node/Daemon Assignment ===
const showAddOwnedDaemonModal = () => {
  ownedDaemonModal.value = {
    visible: true,
    mode: "add",
    daemonId: "",
    instanceLimit: -1,
    ramLimitMB: -1,
    loading: false
  };
  loadAvailableDaemons();
};

const showEditOwnedDaemonModal = (ownedDaemon: any) => {
  ownedDaemonModal.value = {
    visible: true,
    mode: "edit",
    daemonId: ownedDaemon.daemonId,
    instanceLimit: ownedDaemon.instanceLimit,
    ramLimitMB: ownedDaemon.ramLimitMB || -1,
    loading: false
  };
};

const handleAssignDaemon = async () => {
  if (!ownedDaemonModal.value.daemonId) {
    message.error("Please select a daemon");
    return;
  }

  try {
    ownedDaemonModal.value.loading = true;

    if (ownedDaemonModal.value.mode === "add") {
      const res = await executeAssignDaemon({
        data: {
          userUuid: userUuid.value,
          daemonId: ownedDaemonModal.value.daemonId,
          instanceLimit: ownedDaemonModal.value.instanceLimit,
          ramLimitMB: ownedDaemonModal.value.ramLimitMB
        }
      });

      if (res.value?.success) {
        message.success("Daemon assigned successfully");
        await loadUserData();
        ownedDaemonModal.value.visible = false;
      } else {
        message.error(res.value?.error || "Failed to assign daemon");
      }
    } else {
      const res = await executeUpdateLimit({
        data: {
          userUuid: userUuid.value,
          daemonId: ownedDaemonModal.value.daemonId,
          instanceLimit: ownedDaemonModal.value.instanceLimit,
          ramLimitMB: ownedDaemonModal.value.ramLimitMB
        }
      });

      if (res.value?.success) {
        message.success("Limits updated successfully");
        await loadUserData();
        ownedDaemonModal.value.visible = false;
      } else {
        message.error(res.value?.error || "Failed to update limits");
      }
    }
  } catch (error: any) {
    message.error(error.message || "Operation failed");
  } finally {
    ownedDaemonModal.value.loading = false;
  }
};

const handleRemoveOwnedDaemon = async (daemonId: string) => {
  Modal.confirm({
    title: "Remove Owned Daemon",
    content: "Are you sure you want to remove this daemon from the user?",
    okText: "Remove",
    okType: "danger",
    cancelText: "Cancel",
    onOk: async () => {
      try {
        const res = await executeRemoveDaemon({
          data: {
            userUuid: userUuid.value,
            daemonId
          }
        });

        if (res.value?.success) {
          message.success("Daemon removed successfully");
          await loadUserData();
        } else {
          message.error(res.value?.error || "Failed to remove daemon");
        }
      } catch (error: any) {
        message.error(error.message || "Failed to remove daemon");
      }
    }
  });
};

// === Instance Assignment ===
const showAssignInstanceModal = async () => {
  instanceModal.value = {
    visible: true,
    selectedDaemon: "",
    selectedInstance: "",
    ramAllocatedMB: 1024,
    maxSubUsers: 3,
    loading: false,
    loadingInstances: false
  };
  await loadAvailableDaemons();
};

const loadInstancesForDaemon = async (daemonId: string) => {
  if (!daemonId) {
    availableInstances.value = [];
    return;
  }

  try {
    instanceModal.value.loadingInstances = true;
    const res = await executeGetInstances({
      params: {
        daemonId,
        page: 1,
        page_size: 1000
      }
    });
    availableInstances.value = res.value?.data || [];
  } catch (error: any) {
    message.error("Failed to load instances: " + error.message);
  } finally {
    instanceModal.value.loadingInstances = false;
  }
};

const handleDaemonChange = (daemonId: string) => {
  instanceModal.value.selectedInstance = "";
  loadInstancesForDaemon(daemonId);
};

const handleAssignInstance = async () => {
  if (!instanceModal.value.selectedDaemon) {
    message.error("Please select a daemon");
    return;
  }

  if (!instanceModal.value.selectedInstance) {
    message.error("Please select an instance");
    return;
  }

  // Check if instance is already assigned
  const alreadyAssigned = userData.value.instances?.some(
    (inst: any) =>
      inst.instanceUuid === instanceModal.value.selectedInstance &&
      inst.daemonId === instanceModal.value.selectedDaemon
  );

  if (alreadyAssigned) {
    message.error("This instance is already assigned to this user");
    return;
  }

  try {
    instanceModal.value.loading = true;

    // Get instance details
    const selectedInstance = availableInstances.value.find(
      (inst: any) => inst.uuid === instanceModal.value.selectedInstance
    );

    // Add instance to user's instances array
    const updatedInstances = [
      ...(userData.value.instances || []),
      {
        instanceUuid: instanceModal.value.selectedInstance,
        daemonId: instanceModal.value.selectedDaemon,
        ramAllocatedMB: instanceModal.value.ramAllocatedMB,
        maxSubUsers: instanceModal.value.maxSubUsers
      }
    ];

    const res = await executeUpdateUserInstance({
      data: {
        uuid: userUuid.value,
        config: {
          instances: updatedInstances
        }
      }
    });

    if (res.value) {
      message.success(`Instance "${selectedInstance?.config?.nickname || 'Unnamed'}" assigned successfully`);
      await loadUserData();
      instanceModal.value.visible = false;
    } else {
      message.error("Failed to assign instance");
    }
  } catch (error: any) {
    message.error(error.message || "Failed to assign instance");
  } finally {
    instanceModal.value.loading = false;
  }
};

const handleRemoveInstance = (instanceUuid: string, daemonId: string) => {
  Modal.confirm({
    title: "Remove Instance",
    content: "Are you sure you want to remove this instance from the user? This will also remove any sub-users they created for this instance.",
    okText: "Remove",
    okType: "danger",
    cancelText: "Cancel",
    onOk: async () => {
      try {
        const updatedInstances = userData.value.instances.filter(
          (inst: any) => !(inst.instanceUuid === instanceUuid && inst.daemonId === daemonId)
        );

        const res = await executeUpdateUserInstance({
          data: {
            uuid: userUuid.value,
            config: {
              instances: updatedInstances
            }
          }
        });

        if (res.value) {
          message.success("Instance removed successfully");
          await loadUserData();
        } else {
          message.error("Failed to remove instance");
        }
      } catch (error: any) {
        message.error(error.message || "Failed to remove instance");
      }
    }
  });
};

const getInstanceCount = (daemonId: string) => {
  if (!userData.value?.instances) return 0;
  return userData.value.instances.filter((inst: any) => inst.daemonId === daemonId).length;
};

const getInstanceName = (instanceUuid: string) => {
  return instanceUuid.substring(0, 8);
};

onMounted(() => {
  loadUserData();
});
</script>

<template>
  <CardPanel :card="card">
    <div class="resource-assignment-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <UserOutlined class="page-icon" />
          <div>
            <h1 class="page-title">Manage User Resources</h1>
            <p v-if="userData" class="page-subtitle">
              {{ userData.userName }} - Assign nodes and instances
            </p>
            <p v-else class="page-subtitle">Loading user data...</p>
          </div>
        </div>
        <button class="reload-btn" @click="loadUserData" :disabled="loading">
          <ReloadOutlined :spin="loading" />
          Reload
        </button>
      </div>

      <!-- User Info Card -->
      <div v-if="userData" class="user-info-card">
        <div class="info-row">
          <div class="info-item">
            <IdcardOutlined class="info-icon" />
            <span class="info-label">Username:</span>
            <span class="info-value">{{ userData.userName }}</span>
          </div>
          <div class="info-item">
            <DatabaseOutlined class="info-icon" />
            <span class="info-label">Instances:</span>
            <span class="info-value">{{ userData.instances?.length || 0 }}</span>
          </div>
          <div class="info-item">
            <CloudServerOutlined class="info-icon" />
            <span class="info-label">Owned Nodes:</span>
            <span class="info-value">{{ userData.ownedDaemons?.length || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Assigned Instances Section -->
      <div class="resource-section">
        <div class="section-header">
          <div class="header-content">
            <DatabaseOutlined class="section-icon" />
            <div>
              <h2>Assigned Instances</h2>
              <p>Direct instance assignments with permissions</p>
            </div>
          </div>
          <button class="btn-add" @click="showAssignInstanceModal()">
            <PlusOutlined />
            Assign Instance
          </button>
        </div>

        <div v-if="userData?.instances && userData.instances.length > 0" class="resource-grid">
          <div
            v-for="instance in userData.instances"
            :key="`${instance.daemonId}-${instance.instanceUuid}`"
            class="resource-card"
          >
            <div class="card-header">
              <div class="card-icon">
                <DatabaseOutlined />
              </div>
              <div class="card-info">
                <div class="card-name">{{ instance.instanceInfo?.config?.nickname || getInstanceName(instance.instanceUuid) }}</div>
                <div class="card-id">UUID: {{ instance.instanceUuid.substring(0, 8) }}...</div>
              </div>
            </div>
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-label">RAM:</span>
                <span class="stat-value">{{ instance.ramAllocatedMB ? (instance.ramAllocatedMB / 1024).toFixed(1) + 'GB' : 'Not set' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Max Sub-Users:</span>
                <span class="stat-value">{{ instance.maxSubUsers ?? 3 }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Daemon:</span>
                <span class="stat-value">{{ instance.daemonId.substring(0, 8) }}...</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-remove" @click="handleRemoveInstance(instance.instanceUuid, instance.daemonId)">
                <DeleteOutlined />
                Remove
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <DatabaseOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
          <p>No instances assigned</p>
          <p class="empty-hint">Click "Assign Instance" to give this user direct access to a specific instance</p>
        </div>
      </div>

      <!-- Owned Nodes Section -->
      <div class="resource-section">
        <div class="section-header">
          <div class="header-content">
            <CloudServerOutlined class="section-icon" />
            <div>
              <h2>Owned Nodes</h2>
              <p>User can create instances on these nodes with limits</p>
            </div>
          </div>
          <button class="btn-add" @click="showAddOwnedDaemonModal()">
            <PlusOutlined />
            Assign Node
          </button>
        </div>

        <div v-if="userData?.ownedDaemons && userData.ownedDaemons.length > 0" class="resource-grid">
          <div
            v-for="ownedDaemon in userData.ownedDaemons"
            :key="ownedDaemon.daemonId"
            class="resource-card"
          >
            <div class="card-header">
              <div class="card-icon">
                <CloudServerOutlined />
              </div>
              <div class="card-info">
                <div class="card-name">{{ ownedDaemon.daemonName }}</div>
                <div class="card-id">ID: {{ ownedDaemon.daemonId.substring(0, 8) }}...</div>
              </div>
            </div>
            <div class="card-stats">
              <div class="stat-item">
                <span class="stat-label">Instances:</span>
                <span class="stat-value">{{ getInstanceCount(ownedDaemon.daemonId) }} / {{ ownedDaemon.instanceLimit === -1 ? '∞' : ownedDaemon.instanceLimit }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">RAM Limit:</span>
                <span class="stat-value">{{ ownedDaemon.ramLimitMB === -1 ? '∞' : (ownedDaemon.ramLimitMB / 1024).toFixed(1) + 'GB' }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Assigned:</span>
                <span class="stat-value">{{ new Date(ownedDaemon.assignedAt).toLocaleDateString() }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-edit" @click="showEditOwnedDaemonModal(ownedDaemon)">
                <EditOutlined />
                Edit
              </button>
              <button class="btn-remove" @click="handleRemoveOwnedDaemon(ownedDaemon.daemonId)">
                <DeleteOutlined />
                Remove
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <CloudServerOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
          <p>No owned nodes assigned</p>
          <p class="empty-hint">Click "Assign Node" to give this user access to create instances on a node</p>
        </div>
      </div>
    </div>

    <!-- Instance Assignment Modal -->
    <a-modal
      v-model:open="instanceModal.visible"
      title="Assign Instance to User"
      centered
      :destroy-on-close="true"
      :width="700"
      @cancel="instanceModal.visible = false"
    >
      <div class="modal-content">
        <a-form layout="vertical">
          <a-form-item label="Daemon/Node" required>
            <a-select
              v-model:value="instanceModal.selectedDaemon"
              placeholder="Select a daemon first"
              size="large"
              @change="handleDaemonChange"
            >
              <a-select-option
                v-for="daemon in availableDaemons"
                :key="daemon.uuid"
                :value="daemon.uuid"
              >
                {{ daemon.remarks || `${daemon.ip}:${daemon.port}` }}
                <span style="color: #999; margin-left: 8px;">
                  ({{ daemon.available ? 'Online' : 'Offline' }})
                </span>
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="Instance" required>
            <a-select
              v-model:value="instanceModal.selectedInstance"
              placeholder="Select an instance"
              size="large"
              :disabled="!instanceModal.selectedDaemon"
              :loading="instanceModal.loadingInstances"
            >
              <a-select-option
                v-for="instance in availableInstances"
                :key="instance.uuid"
                :value="instance.uuid"
              >
                {{ instance.config?.nickname || instance.uuid.substring(0, 8) }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="RAM Allocation (MB)">
            <a-input-number
              v-model:value="instanceModal.ramAllocatedMB"
              :min="0"
              :step="256"
              size="large"
              style="width: 100%"
              placeholder="e.g., 1024 for 1GB"
            />
            <div class="field-hint">
              Track RAM quota and enforce limits for Docker instances. Non-Docker instances track quota only.
            </div>
          </a-form-item>

          <a-form-item label="Max Sub-Users" required>
            <a-input-number
              v-model:value="instanceModal.maxSubUsers"
              :min="1"
              :max="10"
              size="large"
              style="width: 100%"
              placeholder="Default: 3"
            />
            <div class="field-hint">
              How many sub-users can this user create for this instance? (Default: 3, Max: 10)
            </div>
          </a-form-item>
        </a-form>
      </div>

      <template #footer>
        <button class="btn-cancel" @click="instanceModal.visible = false">Cancel</button>
        <button
          class="btn-primary"
          :disabled="instanceModal.loading || !instanceModal.selectedDaemon || !instanceModal.selectedInstance"
          @click="handleAssignInstance"
        >
          {{ instanceModal.loading ? 'Assigning...' : 'Assign Instance' }}
        </button>
      </template>
    </a-modal>

    <!-- Node/Daemon Assignment Modal -->
    <a-modal
      v-model:open="ownedDaemonModal.visible"
      :title="ownedDaemonModal.mode === 'add' ? 'Assign Node to User' : 'Edit Node Limits'"
      centered
      :destroy-on-close="true"
      :width="600"
      @cancel="ownedDaemonModal.visible = false"
    >
      <div class="modal-content">
        <a-form layout="vertical">
          <a-form-item label="Daemon/Node" v-if="ownedDaemonModal.mode === 'add'" required>
            <a-select
              v-model:value="ownedDaemonModal.daemonId"
              placeholder="Select a daemon"
              size="large"
            >
              <a-select-option
                v-for="daemon in availableDaemons.filter((d: any) => !userData?.ownedDaemons?.some((od: any) => od.daemonId === d.uuid))"
                :key="daemon.uuid"
                :value="daemon.uuid"
              >
                {{ daemon.remarks || `${daemon.ip}:${daemon.port}` }}
                <span style="color: #999; margin-left: 8px;">
                  ({{ daemon.available ? 'Online' : 'Offline' }})
                </span>
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="Instance Limit">
            <a-input-number
              v-model:value="ownedDaemonModal.instanceLimit"
              :min="-1"
              size="large"
              style="width: 100%"
              placeholder="-1 for unlimited"
            />
            <div class="field-hint">
              Set to -1 for unlimited instances, or specify a positive number
            </div>
          </a-form-item>

          <a-form-item label="RAM Limit (MB)">
            <a-input-number
              v-model:value="ownedDaemonModal.ramLimitMB"
              :min="-1"
              :step="1024"
              size="large"
              style="width: 100%"
              placeholder="-1 for unlimited"
            />
            <div class="field-hint">
              Total RAM this user can allocate across all instances on this node. Docker instances will have memory limits enforced at container level. Set to -1 for unlimited.
            </div>
          </a-form-item>
        </a-form>
      </div>

      <template #footer>
        <button class="btn-cancel" @click="ownedDaemonModal.visible = false">Cancel</button>
        <button
          class="btn-primary"
          :disabled="ownedDaemonModal.loading"
          @click="handleAssignDaemon"
        >
          {{ ownedDaemonModal.loading ? (ownedDaemonModal.mode === 'add' ? 'Assigning...' : 'Updating...') : (ownedDaemonModal.mode === 'add' ? 'Assign' : 'Update') }}
        </button>
      </template>
    </a-modal>
  </CardPanel>
</template>

<style scoped lang="less">
.resource-assignment-page {
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

.user-info-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 32px;

  .info-row {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .info-icon {
      font-size: 18px;
      color: #ff8c00;
    }

    .info-label {
      font-size: 14px;
      color: var(--color-text-3);
    }

    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-1);
    }
  }
}

.resource-section {
  margin-bottom: 40px;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;

      .section-icon {
        font-size: 32px;
        color: #ff8c00;
      }

      h2 {
        font-size: 22px;
        font-weight: 600;
        margin: 0;
        color: var(--color-text-1);
      }

      p {
        font-size: 13px;
        color: var(--color-text-3);
        margin: 4px 0 0;
      }
    }

    .btn-add {
      padding: 10px 20px;
      background: linear-gradient(135deg, #ff8c00, #ff9d1f);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(255, 140, 0, 0.4);
      }
    }
  }

  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 24px;
  }

  .resource-card {
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.3s ease;

    &:hover {
      border-color: #ff8c00;
      box-shadow: 0 8px 24px rgba(255, 140, 0, 0.12);
      transform: translateY(-2px);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--color-border-2);

      .card-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #ff8c00, #ff9d1f);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
      }

      .card-info {
        flex: 1;

        .card-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-1);
        }

        .card-id {
          font-size: 12px;
          color: var(--color-text-3);
          font-family: monospace;
          margin-top: 2px;
        }
      }
    }

    .card-stats {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;

      .stat-item {
        display: flex;
        justify-content: space-between;
        font-size: 13px;

        .stat-label {
          color: var(--color-text-3);
        }

        .stat-value {
          font-weight: 500;
          color: var(--color-text-1);
        }
      }
    }

    .card-actions {
      display: flex;
      gap: 8px;

      button {
        flex: 1;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
        border: 1px solid var(--color-border-2);
      }

      .btn-edit {
        background: var(--color-bg-3);
        color: var(--color-text-1);

        &:hover {
          border-color: #1677ff;
          color: #1677ff;
          background: rgba(22, 119, 255, 0.05);
        }
      }

      .btn-remove {
        background: var(--color-bg-3);
        color: var(--color-text-1);

        &:hover {
          border-color: #ff4d4f;
          color: #ff4d4f;
          background: rgba(255, 77, 79, 0.05);
        }
      }
    }
  }

  .empty-state {
    text-align: center;
    padding: 60px 24px;
    background: var(--color-bg-2);
    border: 1px dashed var(--color-border-2);
    border-radius: 12px;
    color: var(--color-text-3);

    p {
      margin: 4px 0;
      font-size: 14px;
    }

    .empty-hint {
      font-size: 12px;
      color: var(--color-text-4);
      margin-top: 8px;
    }
  }
}

.modal-content {
  padding: 16px 0;

  .field-hint {
    font-size: 12px;
    color: var(--color-text-3);
    margin-top: 8px;
  }
}

.btn-cancel,
.btn-primary {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
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

.btn-primary {
  background: #ff8c00;
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
</style>
