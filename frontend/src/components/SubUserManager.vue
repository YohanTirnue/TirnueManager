<script setup lang="ts">
import { ref, computed, watch, h } from "vue";
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
  FolderOutlined
} from "@ant-design/icons-vue";
import type { Rule } from "ant-design-vue/es/form";
import { reportErrorMsg } from "@/tools/validator";
import type { UserPermissions } from "@/types/user";
import {
  getSubUsers,
  createSubUser,
  updateSubUserPermissions,
  deleteSubUser,
  getParentUsers
} from "@/services/apis";
import { useAppStateStore } from "@/stores/useAppStateStore";
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

const props = defineProps<{
  visible: boolean;
  daemonId: string;
  instanceUuid: string;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "refresh"): void;
}>();

const appStateStore = useAppStateStore();

const MAX_SUB_USERS = 3;
const subUsers = ref<SubUser[]>([]);
const parentUsers = ref<Array<{ uuid: string; userName: string; permission: number }>>([]);
const parentUserMap = ref<Map<string, string>>(new Map()); // uuid -> userName
const loading = ref(false);
const dialogVisible = ref(false);
const isEditMode = ref(false);
const formRef = ref<FormInstance>();

const isAdmin = computed(() => {
  const userInfo = appStateStore.state.userInfo;
  return userInfo && userInfo.permission === 10;
});

const availableParents = computed(() => {
  if (!isAdmin.value) return [];

  // Count sub-users per parent
  const subUserCounts = new Map<string, number>();
  for (const subUser of subUsers.value) {
    if (subUser.parentUserId) {
      const count = subUserCounts.get(subUser.parentUserId) || 0;
      subUserCounts.set(subUser.parentUserId, count + 1);
    }
  }

  // Filter parents who have < 3 sub-users
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

const formData = ref({
  uuid: "",
  email: "",
  permissions: _.cloneDeep(defaultPermissions),
  parentUuid: ""
});

const canAddMore = computed(() => {
  // For admins, check if there are any available parent slots
  if (isAdmin.value) {
    return availableParents.value.length > 0;
  }
  // For regular users, check their own sub-user count
  return subUsers.value.length < MAX_SUB_USERS;
});

const formRules: Record<string, Rule[]> = {
  email: [
    { required: true, message: "Email is required" },
    { type: "email", message: "Please enter a valid email address", trigger: "blur" }
  ],
  parentUuid: [
    {
      required: true,
      validator: async (_rule: Rule, value: string) => {
        if (isAdmin.value && !isEditMode.value && !value) {
          throw new Error("Please select a parent user");
        }
      },
      trigger: "blur"
    }
  ]
};

watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      if (isAdmin.value) {
        // Fetch parent users first so map building has the data
        await fetchParentUsers();
      }
      await fetchSubUsers();
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

    // Build parent user map for displaying parent names
    if (isAdmin.value) {
      const map = new Map<string, string>();
      for (const subUser of subUsers.value) {
        if (subUser.parentUserId) {
          // Find parent username from parentUsers list
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

const handleClose = () => {
  emit("update:visible", false);
};

const handleAddSubUser = () => {
  isEditMode.value = false;
  formData.value = {
    uuid: "",
    email: "",
    permissions: _.cloneDeep(defaultPermissions),
    parentUuid: ""
  };
  dialogVisible.value = true;
};

const handleEditSubUser = (subUser: SubUser) => {
  isEditMode.value = true;
  formData.value = {
    uuid: subUser.uuid,
    email: "",
    permissions: subUser.permissions
      ? { ...defaultPermissions, ...subUser.permissions }
      : _.cloneDeep(defaultPermissions),
    parentUuid: ""
  };
  dialogVisible.value = true;
};

const handleDeleteSubUser = (subUser: SubUser) => {
  Modal.confirm({
    title: t("TXT_CODE_5c972b7e"),
    content: `${t("TXT_CODE_e4a60882")} "${subUser.userName}"?`,
    okText: t("TXT_CODE_c3c9a8d2"),
    cancelText: t("TXT_CODE_d507abff"),
    okType: "danger",
    async onOk() {
      try {
        await deleteSubUser().execute({
          params: {
            subUserUuid: subUser.uuid
          }
        });
        message.success(t("TXT_CODE_27efac3b"));
        fetchSubUsers();
        emit("refresh");
      } catch (error: any) {
        reportErrorMsg(error.message);
      }
    }
  });
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    loading.value = true;

    if (isEditMode.value) {
      // Update permissions only
      await updateSubUserPermissions().execute({
        params: {
          subUserUuid: formData.value.uuid
        },
        data: {
          permissions: formData.value.permissions
        }
      });
      message.success(t("TXT_CODE_27efac3b"));
    } else {
      // Send invitation to sub-user via email
      const inviteData: any = {
        email: formData.value.email,
        permissions: formData.value.permissions
      };

      // If admin, include parentUuid
      if (isAdmin.value && formData.value.parentUuid) {
        inviteData.parentUuid = formData.value.parentUuid;
      }

      await createSubUser().execute({
        params: {
          daemonId: props.daemonId,
          instanceUuid: props.instanceUuid
        },
        data: inviteData
      });
      message.success("Invitation sent successfully");
    }

    dialogVisible.value = false;
    fetchSubUsers();
    if (isAdmin.value) {
      fetchParentUsers();
    }
    emit("refresh");
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    loading.value = false;
  }
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
          @click="handleAddSubUser"
        >
          <PlusOutlined />
          <span>Invite Sub-User</span>
        </button>
        <div class="slot-indicator">
          <div class="slot-dots">
            <span
              v-for="i in MAX_SUB_USERS"
              :key="i"
              class="slot-dot"
              :class="{ filled: i <= subUsers.length }"
            ></span>
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
                <span v-if="isAdmin && item.parentUserId" class="parent-badge">
                  {{ parentUserMap.get(item.parentUserId) || "Unknown" }}
                </span>
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

        <div v-else class="empty-state">
          <div class="empty-icon">
            <TeamOutlined />
          </div>
          <h4>No Sub-Users</h4>
          <p>Create sub-users to share limited access to this instance</p>
        </div>
      </a-spin>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="close-btn" @click="handleClose">Close</button>
      </div>
    </div>

    <!-- Sub-User Form Dialog -->
    <a-modal
      v-model:open="dialogVisible"
      :width="700"
      :footer="null"
      class="permission-modal"
      @cancel="dialogVisible = false"
    >
      <template #title>
        <div class="modal-header">
          <div class="header-icon" :class="isEditMode ? 'edit' : 'create'">
            <EditOutlined v-if="isEditMode" />
            <PlusOutlined v-else />
          </div>
          <div class="header-content">
            <h3>{{ isEditMode ? 'Edit Permissions' : 'Invite Sub-User' }}</h3>
            <span class="header-subtitle">
              {{ isEditMode ? 'Configure access permissions' : 'Send an invitation email to add a new sub-user' }}
            </span>
          </div>
        </div>
      </template>

      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
        class="modern-form"
      >
        <!-- Parent User Selection (Admin only) -->
        <div v-if="!isEditMode && isAdmin" class="form-section">
          <div class="section-header">
            <UserOutlined />
            <span>Parent User</span>
          </div>
          <a-form-item name="parentUuid">
            <a-select
              v-model:value="formData.parentUuid"
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

        <!-- Email Invitation -->
        <div v-if="!isEditMode" class="form-section">
          <div class="section-header">
            <UserOutlined />
            <span>Invitation Details</span>
          </div>
          <a-form-item name="email" label="Email Address">
            <a-input
              v-model:value="formData.email"
              placeholder="Enter email address to send invitation"
              size="large"
              type="email"
            />
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
                  <a-checkbox v-model:checked="formData.permissions.canStartInstances" />
                  <span>Start</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canRestartInstances" />
                  <span>Restart</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canStopInstances" />
                  <span>Stop</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canAccessConsole" />
                  <span>Console</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canViewLogs" />
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
                  <a-checkbox v-model:checked="formData.permissions.canUploadFiles" />
                  <span>Upload</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canDownloadFiles" />
                  <span>Download</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canModifyFiles" />
                  <span>Modify</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canDeleteFiles" />
                  <span>Delete</span>
                </label>
                <label class="permission-item">
                  <a-checkbox v-model:checked="formData.permissions.canAccessFileManager" />
                  <span>File Manager</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="dialogVisible = false">Cancel</button>
          <button type="button" class="btn-submit" @click="handleSubmit">
            {{ isEditMode ? 'Save Changes' : 'Send Invite' }}
          </button>
        </div>
      </a-form>
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

.btn-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
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
