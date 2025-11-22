<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { t } from "@/lang/i18n";
import { message, Modal, type FormInstance } from "ant-design-vue";
import {
  UserOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  TeamOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  ControlOutlined,
  FolderOutlined,
  MailOutlined,
  ClockCircleOutlined,
  SendOutlined,
  CheckCircleOutlined
} from "@ant-design/icons-vue";
import type { Rule } from "ant-design-vue/es/form";
import { reportErrorMsg } from "@/tools/validator";
import type { UserPermissions } from "@/types/user";
import {
  getSubUsers,
  updateSubUserPermissions,
  deleteSubUser,
  getParentUsers
} from "@/services/apis";
import { useAppStateStore } from "@/stores/useAppStateStore";
import axios from "axios";
import _ from "lodash";

interface SubUser {
  uuid: string;
  userName: string;
  registerTime: string;
  loginTime: string;
  permissions?: UserPermissions;
  isSubUser: boolean;
  parentUserId?: string;
}

interface PendingInvitation {
  invitationId: string;
  inviteeEmail: string;
  instanceName: string;
  instanceUuid: string;
  daemonId: string;
  status: string;
  createdAt: number;
  expiresAt: number;
}

const props = defineProps<{
  visible: boolean;
  daemonId: string;
  instanceUuid: string;
  instanceName?: string;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "refresh"): void;
}>();

const appStateStore = useAppStateStore();

const MAX_SUB_USERS = 3;
const subUsers = ref<SubUser[]>([]);
const pendingInvitations = ref<PendingInvitation[]>([]);
const parentUsers = ref<Array<{ uuid: string; userName: string; permission: number }>>([]);
const parentUserMap = ref<Map<string, string>>(new Map());
const loading = ref(false);

// Dialog states
const inviteDialogVisible = ref(false);
const otpDialogVisible = ref(false);
const editDialogVisible = ref(false);
const formRef = ref<FormInstance>();

// Invitation flow state
const inviteStep = ref<"email" | "otp">("email");
const pendingKey = ref("");
const otpCode = ref("");
const otpLoading = ref(false);

const isAdmin = computed(() => {
  const userInfo = appStateStore.state.userInfo;
  return userInfo && userInfo.permission === 10;
});

const availableParents = computed(() => {
  if (!isAdmin.value) return [];
  const subUserCounts = new Map<string, number>();
  for (const subUser of subUsers.value) {
    if (subUser.parentUserId) {
      const count = subUserCounts.get(subUser.parentUserId) || 0;
      subUserCounts.set(subUser.parentUserId, count + 1);
    }
  }
  return parentUsers.value.filter((parent) => {
    const count = subUserCounts.get(parent.uuid) || 0;
    return count < MAX_SUB_USERS;
  });
});

const defaultPermissions: UserPermissions = {
  canUploadFiles: true,
  canDownloadFiles: true,
  canDeleteFiles: false,
  canModifyFiles: true,
  canAccessConsole: true,
  canStartInstances: true,
  canRestartInstances: true,
  canStopInstances: true,
  canTerminateInstances: false,
  canViewLogs: true,
  canAccessConfigFiles: false,
  canAccessFileManager: true,
  canAccessMinecraftQuery: true,
  canAccessTerminalSettings: false,
  canAccessScheduledTasks: false,
  canAccessEventTasks: false,
  canAccessInstanceSettings: false,
  canAccessServerMarket: false,
  disableRightClick: false,
  disableKeyboardShortcuts: false,
  disableTextSelection: false,
  disableCopy: false,
  disablePaste: false
};

const inviteFormData = ref({
  inviteeEmail: "",
  expiryMinutes: 30 as 30 | 60,
  permissions: _.cloneDeep(defaultPermissions),
  parentUuid: ""
});

const editFormData = ref({
  uuid: "",
  userName: "",
  permissions: {
    canUploadFiles: true,
    canDownloadFiles: true,
    canDeleteFiles: false,
    canModifyFiles: true,
    canAccessConsole: true,
    canStartInstances: true,
    canRestartInstances: true,
    canStopInstances: true,
    canTerminateInstances: false,
    canViewLogs: true,
    canAccessConfigFiles: false,
    canAccessFileManager: true,
    canAccessMinecraftQuery: true,
    canAccessTerminalSettings: false,
    canAccessScheduledTasks: false,
    canAccessEventTasks: false,
    canAccessInstanceSettings: false,
    canAccessServerMarket: false,
    disableRightClick: false,
    disableKeyboardShortcuts: false,
    disableTextSelection: false,
    disableCopy: false,
    disablePaste: false
  } as UserPermissions
});

const canAddMore = computed(() => {
  if (isAdmin.value) {
    return availableParents.value.length > 0;
  }
  return subUsers.value.length < MAX_SUB_USERS;
});

const inviteFormRules: Record<string, Rule[]> = {
  inviteeEmail: [
    { required: true, message: "Email is required" },
    { type: "email", message: "Please enter a valid email address" }
  ],
  parentUuid: [
    {
      required: true,
      validator: async (_rule: Rule, value: string) => {
        if (isAdmin.value && !value) {
          throw new Error("Please select a parent user");
        }
      }
    }
  ]
};

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      if (isAdmin.value) {
        await fetchParentUsers();
      }
      await fetchSubUsers();
      await fetchPendingInvitations();
    }
  }
);

const fetchSubUsers = async () => {
  loading.value = true;
  try {
    const res = await getSubUsers().execute({
      params: {
        daemonId: props.daemonId,
        instanceUuid: props.instanceUuid
      }
    });
    subUsers.value = res.value || [];

    if (isAdmin.value) {
      const map = new Map<string, string>();
      for (const subUser of subUsers.value) {
        if (subUser.parentUserId) {
          const parent = parentUsers.value.find((p) => p.uuid === subUser.parentUserId);
          if (parent) {
            map.set(subUser.parentUserId, parent.userName);
          }
        }
      }
      parentUserMap.value = map;
    }
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    loading.value = false;
  }
};

const fetchParentUsers = async () => {
  try {
    const res = await getParentUsers().execute({
      params: {
        daemonId: props.daemonId,
        instanceUuid: props.instanceUuid
      }
    });
    parentUsers.value = res.value || [];
  } catch (error: any) {
    reportErrorMsg(error.message);
  }
};

const fetchPendingInvitations = async () => {
  try {
    const { state } = useAppStateStore();
    const res = await axios.get("./api/sub-users/invite/list", {
      params: { token: state.userInfo?.token }
    });
    // Filter to only show invitations for this instance (use stable identifiers, not mutable names)
    pendingInvitations.value = (res.data.data || []).filter(
      (inv: PendingInvitation) =>
        inv.instanceUuid === props.instanceUuid && inv.daemonId === props.daemonId
    );
  } catch (error: any) {
    console.error("Failed to fetch invitations:", error);
  }
};

const handleClose = () => {
  emit("update:visible", false);
};

const handleInviteSubUser = () => {
  inviteStep.value = "email";
  inviteFormData.value = {
    inviteeEmail: "",
    expiryMinutes: 30,
    permissions: _.cloneDeep(defaultPermissions),
    parentUuid: ""
  };
  pendingKey.value = "";
  otpCode.value = "";
  inviteDialogVisible.value = true;
};

const handleSendInvitation = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;

    const { state } = useAppStateStore();
    const res = await axios.post("./api/sub-users/invite/initiate", {
      inviteeEmail: inviteFormData.value.inviteeEmail,
      expiryMinutes: inviteFormData.value.expiryMinutes,
      permissions: inviteFormData.value.permissions,
      instanceName: props.instanceName || "Instance",
      parentUuid: isAdmin.value ? inviteFormData.value.parentUuid : undefined
    }, {
      params: {
        token: state.userInfo?.token,
        daemonId: props.daemonId,
        instanceUuid: props.instanceUuid
      }
    });

    message.success("Invitation sent successfully");
    inviteDialogVisible.value = false;
    fetchPendingInvitations();
    emit("refresh");
  } catch (error: any) {
    reportErrorMsg(error.response?.data?.data || error.message);
  } finally {
    loading.value = false;
  }
};

const handleVerifyOtp = async () => {
  if (!otpCode.value || otpCode.value.length !== 6) {
    message.error("Please enter a valid 6-digit code");
    return;
  }

  otpLoading.value = true;
  try {
    const { state } = useAppStateStore();
    await axios.post("./api/sub-users/invite/verify-owner", {
      pendingKey: pendingKey.value,
      otp: otpCode.value
    }, {
      params: { token: state.userInfo?.token }
    });

    message.success("Invitation sent successfully");
    inviteDialogVisible.value = false;
    fetchPendingInvitations();
    emit("refresh");
  } catch (error: any) {
    reportErrorMsg(error.response?.data?.data || error.message);
  } finally {
    otpLoading.value = false;
  }
};

const handleEditSubUser = (subUser: SubUser) => {
  editFormData.value = {
    uuid: subUser.uuid,
    userName: subUser.userName,
    permissions: subUser.permissions
      ? { ...editFormData.value.permissions, ...subUser.permissions }
      : { ...editFormData.value.permissions }
  };
  editDialogVisible.value = true;
};

const handleUpdatePermissions = async () => {
  try {
    loading.value = true;
    await updateSubUserPermissions().execute({
      params: {
        subUserUuid: editFormData.value.uuid,
        daemonId: props.daemonId,
        instanceUuid: props.instanceUuid
      },
      data: {
        permissions: editFormData.value.permissions
      }
    });
    message.success("Permissions updated");
    editDialogVisible.value = false;
    fetchSubUsers();
    emit("refresh");
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    loading.value = false;
  }
};

const handleDeleteSubUser = (subUser: SubUser) => {
  Modal.confirm({
    title: "Remove Sub-User",
    content: `Are you sure you want to remove "${subUser.userName}"?`,
    okText: "Remove",
    cancelText: "Cancel",
    okType: "danger",
    async onOk() {
      try {
        await deleteSubUser().execute({
          params: {
            subUserUuid: subUser.uuid,
            daemonId: props.daemonId,
            instanceUuid: props.instanceUuid
          }
        });
        message.success("Sub-user removed");
        fetchSubUsers();
        emit("refresh");
      } catch (error: any) {
        reportErrorMsg(error.message);
      }
    }
  });
};

const handleCancelInvitation = async (invitationId: string) => {
  try {
    const { state } = useAppStateStore();
    await axios.delete(`./api/sub-users/invite/${invitationId}`, {
      params: { token: state.userInfo?.token }
    });
    message.success("Invitation cancelled");
    fetchPendingInvitations();
  } catch (error: any) {
    reportErrorMsg(error.response?.data?.data || error.message);
  }
};

const formatExpiry = (expiresAt: number) => {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return "Expired";
  const minutes = Math.floor(remaining / 60000);
  return `${minutes}m remaining`;
};
</script>

<template>
  <a-modal
    :open="visible"
    :width="900"
    :footer="null"
    class="sub-user-modal"
    @cancel="handleClose"
  >
    <template #title>
      <div class="modal-header">
        <div class="header-icon">
          <TeamOutlined />
        </div>
        <div class="header-content">
          <h3>Sub-User Management</h3>
          <span class="header-subtitle">
            {{ isAdmin ? `${subUsers.length} sub-users total` : `${subUsers.length} of ${MAX_SUB_USERS} slots used` }}
          </span>
        </div>
      </div>
    </template>

    <div class="sub-user-manager">
      <!-- Warning Alerts -->
      <div v-if="!canAddMore" class="alert-banner">
        <div class="alert-icon">
          <ExclamationCircleOutlined />
        </div>
        <div class="alert-content">
          <strong>Limit Reached</strong>
          <span v-if="!isAdmin">Maximum {{ MAX_SUB_USERS }} sub-users allowed</span>
          <span v-else>All parent users have reached maximum capacity</span>
        </div>
      </div>

      <!-- Action Bar -->
      <div class="action-bar">
        <button
          class="add-user-btn"
          :disabled="!canAddMore"
          @click="handleInviteSubUser"
        >
          <MailOutlined />
          <span>Invite Sub-User</span>
        </button>

        <!-- Slot indicator for regular users -->
        <div v-if="!isAdmin" class="slot-indicator">
          <div class="slot-dots">
            <span
              v-for="i in MAX_SUB_USERS"
              :key="i"
              class="slot-dot"
              :class="{ filled: i <= subUsers.length }"
            ></span>
          </div>
        </div>

        <!-- User count for admins -->
        <div v-else class="admin-user-count">
          <span class="count-badge">{{ subUsers.length }}</span>
          <span class="count-label">users from {{ parentUsers.length }} parent{{ parentUsers.length !== 1 ? 's' : '' }}</span>
        </div>
      </div>

      <!-- Pending Invitations -->
      <div v-if="pendingInvitations.length > 0" class="pending-section">
        <h4 class="section-title">
          <ClockCircleOutlined />
          Pending Invitations
        </h4>
        <div class="pending-list">
          <div
            v-for="invitation in pendingInvitations"
            :key="invitation.invitationId"
            class="pending-item"
          >
            <div class="pending-info">
              <MailOutlined />
              <span class="pending-email">{{ invitation.inviteeEmail }}</span>
              <span class="pending-expiry">{{ formatExpiry(invitation.expiresAt) }}</span>
            </div>
            <button class="cancel-btn" @click="handleCancelInvitation(invitation.invitationId)">
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Sub-Users List -->
      <a-spin :spinning="loading">
        <div v-if="subUsers.length > 0" class="users-grid">
          <div
            v-for="item in subUsers"
            :key="item.uuid"
            class="user-card"
          >
            <div class="user-card-header">
              <div class="user-avatar">
                <UserOutlined />
              </div>
              <div class="user-info">
                <h4>{{ item.userName }}</h4>
                <!-- Show parent info prominently for admins -->
                <div v-if="isAdmin && item.parentUserId" class="parent-info">
                  <UserOutlined class="parent-icon" />
                  <span class="parent-name">{{ parentUserMap.get(item.parentUserId) || "Unknown" }}</span>
                </div>
              </div>
            </div>

            <div class="user-card-body">
              <div class="user-meta">
                <div class="meta-item">
                  <span class="meta-label">Created</span>
                  <span class="meta-value">{{ item.registerTime }}</span>
                </div>
                <div v-if="item.loginTime" class="meta-item">
                  <span class="meta-label">Last Login</span>
                  <span class="meta-value">{{ item.loginTime }}</span>
                </div>
              </div>
            </div>

            <div class="user-card-actions">
              <button class="action-btn edit" @click="handleEditSubUser(item)">
                <EditOutlined />
                <span>Permissions</span>
              </button>
              <button class="action-btn delete" @click="handleDeleteSubUser(item)">
                <DeleteOutlined />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="pendingInvitations.length === 0" class="empty-state">
          <div class="empty-icon">
            <TeamOutlined />
          </div>
          <h4>No Sub-Users</h4>
          <p>Invite sub-users via email to share limited access to this instance</p>
        </div>
      </a-spin>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="close-btn" @click="handleClose">Close</button>
      </div>
    </div>

    <!-- Invite Dialog -->
    <a-modal
      v-model:open="inviteDialogVisible"
      :width="600"
      :footer="null"
      class="invite-modal"
      @cancel="inviteDialogVisible = false"
    >
      <template #title>
        <div class="modal-header">
          <div class="header-icon create">
            <MailOutlined />
          </div>
          <div class="header-content">
            <h3>Invite Sub-User</h3>
            <span class="header-subtitle">
              Enter email and set permissions
            </span>
          </div>
        </div>
      </template>

      <div>
        <a-form
          ref="formRef"
          :model="inviteFormData"
          :rules="inviteFormRules"
          layout="vertical"
          class="modern-form"
        >
          <!-- Parent User Selection (Admin only) -->
          <div v-if="isAdmin" class="form-section">
            <div class="section-header">
              <UserOutlined />
              <span>Parent User</span>
            </div>
            <a-form-item name="parentUuid">
              <a-select
                v-model:value="inviteFormData.parentUuid"
                placeholder="Select parent user"
                size="large"
              >
                <a-select-option
                  v-for="parent in availableParents"
                  :key="parent.uuid"
                  :value="parent.uuid"
                >
                  {{ parent.userName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </div>

          <!-- Email & Expiry -->
          <div class="form-section">
            <div class="section-header">
              <MailOutlined />
              <span>Invitation Details</span>
            </div>
            <a-form-item name="inviteeEmail" label="Email Address">
              <a-input
                v-model:value="inviteFormData.inviteeEmail"
                placeholder="Enter invitee's email"
                size="large"
              >
                <template #prefix>
                  <MailOutlined style="color: rgba(0, 0, 0, 0.25)" />
                </template>
              </a-input>
            </a-form-item>
            <a-form-item label="Invitation Expiry">
              <a-radio-group v-model:value="inviteFormData.expiryMinutes" size="large">
                <a-radio-button :value="30">30 minutes</a-radio-button>
                <a-radio-button :value="60">1 hour</a-radio-button>
              </a-radio-group>
            </a-form-item>
          </div>

          <!-- Permissions -->
          <div class="form-section">
            <div class="section-header">
              <SafetyOutlined />
              <span>Permissions</span>
            </div>

            <div class="permissions-container">
              <div class="permission-group">
                <div class="group-header">
                  <ControlOutlined />
                  <span>Instance Control</span>
                </div>
                <div class="permission-items">
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canStartInstances" />
                    <span>Start</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canStopInstances" />
                    <span>Stop</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canRestartInstances" />
                    <span>Restart</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canAccessConsole" />
                    <span>Console</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canViewLogs" />
                    <span>View Logs</span>
                  </label>
                </div>
              </div>

              <div class="permission-group">
                <div class="group-header">
                  <FolderOutlined />
                  <span>File Operations</span>
                </div>
                <div class="permission-items">
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canAccessFileManager" />
                    <span>File Manager</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canUploadFiles" />
                    <span>Upload</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canDownloadFiles" />
                    <span>Download</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canModifyFiles" />
                    <span>Modify</span>
                  </label>
                  <label class="permission-item">
                    <a-checkbox v-model:checked="inviteFormData.permissions.canAccessScheduledTasks" />
                    <span>Schedules</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="inviteDialogVisible = false">Cancel</button>
            <button type="button" class="btn-submit" :disabled="loading" @click="handleSendInvitation">
              <SendOutlined />
              {{ loading ? "Sending..." : "Send Invitation" }}
            </button>
          </div>
        </a-form>
      </div>
    </a-modal>

    <!-- Edit Permissions Dialog -->
    <a-modal
      v-model:open="editDialogVisible"
      :width="600"
      :footer="null"
      class="permission-modal"
      @cancel="editDialogVisible = false"
    >
      <template #title>
        <div class="modal-header">
          <div class="header-icon edit">
            <EditOutlined />
          </div>
          <div class="header-content">
            <h3>Edit Permissions</h3>
            <span class="header-subtitle">{{ editFormData.userName }}</span>
          </div>
        </div>
      </template>

      <div class="form-section">
        <div class="permissions-container">
          <div class="permission-group">
            <div class="group-header">
              <ControlOutlined />
              <span>Instance Control</span>
            </div>
            <div class="permission-items">
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canStartInstances" />
                <span>Start</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canRestartInstances" />
                <span>Restart</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canStopInstances" />
                <span>Stop</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canAccessConsole" />
                <span>Console</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canViewLogs" />
                <span>Logs</span>
              </label>
            </div>
          </div>

          <div class="permission-group">
            <div class="group-header">
              <FolderOutlined />
              <span>File Operations</span>
            </div>
            <div class="permission-items">
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canUploadFiles" />
                <span>Upload</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canDownloadFiles" />
                <span>Download</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canModifyFiles" />
                <span>Modify</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canDeleteFiles" />
                <span>Delete</span>
              </label>
              <label class="permission-item">
                <a-checkbox v-model:checked="editFormData.permissions.canAccessFileManager" />
                <span>File Manager</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="editDialogVisible = false">Cancel</button>
        <button type="button" class="btn-submit" @click="handleUpdatePermissions">
          Save Changes
        </button>
      </div>
    </a-modal>
  </a-modal>
</template>

<style scoped>
/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.header-icon.edit {
  background: linear-gradient(135deg, #ffa500 0%, #ff6b00 100%);
}

.header-icon.create {
  background: linear-gradient(135deg, #ffb347 0%, #ffd700 100%);
}

.header-content h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.header-subtitle {
  font-size: 13px;
  color: var(--color-text-3);
}

/* Main Container */
.sub-user-manager {
  min-height: 300px;
}

/* Alert Banner */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 140, 0, 0.1);
  border: 1px solid rgba(255, 140, 0, 0.3);
  border-radius: 8px;
  margin-bottom: 20px;
}

.alert-icon {
  color: #ff8c00;
  font-size: 18px;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-content strong {
  font-size: 13px;
  color: #ff8c00;
}

.alert-content span {
  font-size: 12px;
  color: var(--color-text-3);
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-user-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
}

.add-user-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.slot-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slot-dots {
  display: flex;
  gap: 6px;
}

.slot-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-border-2);
  transition: all 0.3s ease;
}

.slot-dot.filled {
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
}

/* Admin user count */
.admin-user-count {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.count-label {
  font-size: 12px;
  color: var(--color-text-3);
}

/* Pending Invitations */
.pending-section {
  margin-bottom: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-2);
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
}

.pending-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pending-email {
  font-size: 14px;
  color: var(--color-text-1);
}

.pending-expiry {
  font-size: 12px;
  color: #ff8c00;
  padding: 2px 8px;
  background: rgba(255, 140, 0, 0.1);
  border-radius: 4px;
}

.cancel-btn {
  padding: 6px 12px;
  background: rgba(255, 77, 79, 0.1);
  border: none;
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(255, 77, 79, 0.2);
}

/* Users Grid */
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.user-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.user-card:hover {
  border-color: rgba(255, 140, 0, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.user-info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.parent-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(255, 140, 0, 0.1);
  color: #ff8c00;
  border-radius: 4px;
}

.parent-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.parent-icon {
  font-size: 12px;
  color: #ff8c00;
}

.parent-name {
  font-size: 12px;
  color: #ff8c00;
  font-weight: 500;
}

.user-card-body {
  margin-bottom: 12px;
}

.user-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.meta-label {
  color: var(--color-text-3);
}

.meta-value {
  color: var(--color-text-2);
}

.user-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-2);
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.edit {
  background: rgba(255, 140, 0, 0.1);
  color: #ff8c00;
}

.action-btn.edit:hover {
  background: rgba(255, 140, 0, 0.2);
}

.action-btn.delete {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.action-btn.delete:hover {
  background: rgba(255, 77, 79, 0.2);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: var(--color-bg-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: var(--color-text-3);
}

.empty-state h4 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--color-text-1);
}

.empty-state p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-3);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-2);
}

.close-btn {
  padding: 8px 24px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  color: var(--color-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--color-bg-4);
}

/* Form Styles */
.modern-form {
  padding: 8px 0;
}

.form-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.section-header > span:first-of-type {
  color: #ff8c00;
}

/* Permissions Container */
.permissions-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.permission-group {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 10px;
  padding: 16px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-2);
}

.group-header > span:first-of-type {
  color: #ff8c00;
}

.permission-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.permission-item:hover {
  background: var(--color-bg-3);
}

.permission-item span {
  font-size: 12px;
  color: var(--color-text-2);
}

/* OTP Step */
.otp-step {
  padding: 16px 0;
}

.otp-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: rgba(82, 196, 26, 0.1);
  border: 1px solid rgba(82, 196, 26, 0.3);
  border-radius: 8px;
  margin-bottom: 24px;
}

.otp-info-icon {
  font-size: 20px;
  color: #52c41a;
}

.otp-info p {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-2);
}

.otp-input-container {
  margin-bottom: 24px;
}

.otp-input {
  font-size: 24px;
  text-align: center;
  letter-spacing: 8px;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-2);
}

.btn-cancel {
  padding: 10px 24px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  color: var(--color-text-2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: var(--color-bg-4);
}

.btn-submit {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .permissions-container {
    grid-template-columns: 1fr;
  }

  .users-grid {
    grid-template-columns: 1fr;
  }
}
</style>
