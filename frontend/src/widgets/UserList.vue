<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { t } from "@/lang/i18n";
import { message, Modal, type FormInstance } from "ant-design-vue";
import {
  UserOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CrownOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  MailOutlined,
  SafetyOutlined,
  CloudServerOutlined,
  PlusOutlined
} from "@ant-design/icons-vue";
import type { Rule } from "ant-design-vue/es/form";
import { throttle } from "lodash";
import CardPanel from "@/components/CardPanel.vue";
import { arrayFilter } from "../tools/array";
import { useAppRouters } from "@/hooks/useAppRouters";
import {
  getUserInfo,
  deleteUser as deleteUserApi,
  editUserInfo,
  remoteNodeList
} from "@/services/apis";
import {
  assignOwnedDaemon,
  updateOwnedDaemonLimit,
  removeOwnedDaemon
} from "@/services/apis/user";
import type { LayoutCard } from "@/types/index";
import type { BaseUserInfo, EditUserInfo } from "@/types/user";
import _ from "lodash";
import { PERMISSION_MAP } from "@/config/const";
import { reportErrorMsg } from "@/tools/validator";
import { useAppStateStore } from "@/stores/useAppStateStore";

defineProps<{
  card: LayoutCard;
}>();

const appStateStore = useAppStateStore();

interface dataType {
  total: number;
  pageSize: number;
  page: number;
  maxPage: number;
  data: BaseUserInfo[];
}

const { execute, isLoading: getUserInfoLoading } = getUserInfo();
const { toPage } = useAppRouters();

const currentUserPermission = computed(() => appStateStore.state.userInfo?.permission ?? 0);

// Senior moderators can only create users with permission <= 5 (Moderator)
const availablePermissions = computed(() => {
  const currentPermission = currentUserPermission.value;
  const allPermissions = PERMISSION_MAP;

  // Admins can assign any role
  if (currentPermission >= 10) {
    return allPermissions;
  }

  // Senior moderators can only assign Moderator (5) and below
  if (currentPermission === 7) {
    return Object.fromEntries(
      Object.entries(allPermissions).filter(([key]) => Number(key) <= 5)
    );
  }

  // Everyone else sees default permissions
  return allPermissions;
});

const operationForm = ref({
  name: "",
  currentPage: 1,
  pageSize: 20
});

const total = ref(0);
const data = ref<dataType>();
// Filter out sub-users - they are managed at instance level only
const dataSource = computed(() => {
  const users = data?.value?.data || [];
  return users.filter((user: any) => !user.isSubUser);
});
const selectedUsers = ref<string[]>([]);
const currentRole = ref("");
const actionModalUser = ref<BaseUserInfo | null>(null);
const actionModalOpen = ref(false);

const handleToUserResources = (user: BaseUserInfo) => {
  toPage({
    path: "/users/resources",
    query: {
      uuid: user.uuid
    }
  });
  actionModalUser.value = null;
  actionModalOpen.value = false;
};

const handleTableChange = (page: number) => {
  operationForm.value.currentPage = page;
  fetchData();
};

const fetchData = async () => {
  if (operationForm.value.currentPage < 1) {
    operationForm.value.currentPage = 1;
  }
  data.value?.pageSize && (data.value.pageSize = 0);
  const res = await execute({
    params: {
      userName: operationForm.value.name,
      page: operationForm.value.currentPage,
      page_size: operationForm.value.pageSize,
      role: currentRole.value
    }
  });
  data.value = res.value;
  total.value = res.value?.total ?? 0;
};

const reload = throttle(() => {
  fetchData();
}, 600);

const deleteUser = async (userList: string[]) => {
  try {
    const { execute } = deleteUserApi();
    await execute({
      data: userList
    });
    message.success(t("TXT_CODE_28190dbc"));
    await fetchData();
  } catch (error: any) {
    reportErrorMsg(error.message);
  }
};

const handleDeleteUser = async (user: BaseUserInfo) => {
  await deleteUser([user.uuid]);
  actionModalUser.value = null;
  actionModalOpen.value = false;
};

const handleBatchDelete = async () => {
  if (selectedUsers.value.length === 0) {
    return message.warn(t("TXT_CODE_d78ad17a"));
  }
  Modal.confirm({
    title: "Batch Delete Users",
    content: `Are you sure you want to delete ${selectedUsers.value.length} user(s)?`,
    okType: "danger",
    onOk: async () => {
      await deleteUser(selectedUsers.value);
      selectedUsers.value = [];
    }
  });
};

const showDeleteConfirm = (user: BaseUserInfo) => {
  Modal.confirm({
    title: () => t("TXT_CODE_e99ab99a", { userName: user.userName } as any),
    okType: "danger",
    onOk: () => handleDeleteUser(user),
    maskClosable: true
  });
};

const userDialog = ref({
  status: false,
  title: t("TXT_CODE_79f9a172"),
  confirmBtnLoading: false,
  show: () => {
    userDialog.value.status = true;
  },
  resolve: async () => {
    try {
      await formRef.value?.validateFields();
    } catch (err) {
      return;
    }
    try {
      userDialog.value.confirmBtnLoading = true;
      await editUserInfo().execute({
        data: {
          config: formData.value,
          uuid: formData.value.uuid
        }
      });
      message.success(t("TXT_CODE_27efac3b"));
      userDialog.value.status = false;
      formData.value = _.cloneDeep(formDataOrigin);
    } catch (error: any) {
      return reportErrorMsg(error.message);
    } finally {
      fetchData();
      userDialog.value.confirmBtnLoading = false;
    }
  }
});

const formDataOrigin: EditUserInfo = {
  uuid: "",
  userName: "",
  passWord: "",
  loginTime: "",
  registerTime: "",
  instances: [],
  permission: 1,
  apiKey: "",
  isInit: false,
  secret: "",
  open2FA: false,
  email: "",
  emailVerified: false,
  firstName: "",
  lastName: "",
  location: "",
  createdIp: "",
  lastLoginIp: "",
  accountStatus: ""
};

const formRef = ref<FormInstance>();
const formData = ref<EditUserInfo>(_.cloneDeep(formDataOrigin));
const formRules: Record<string, Rule[]> = {
  userName: [
    { required: true, message: t("TXT_CODE_2695488c") },
    { min: 3, max: 20, message: t("TXT_CODE_3f477ec"), trigger: "blur" }
  ],
  permission: [{ required: true, message: t("TXT_CODE_3bb646e4") }]
};

const handleEditUser = (user: BaseUserInfo) => {
  userDialog.value.title = t("TXT_CODE_79f9a172");
  formData.value = _.cloneDeep(user);
  userDialog.value.show();
  actionModalUser.value = null;
  actionModalOpen.value = false;
};

const search = throttle(async () => {
  operationForm.value.currentPage = 1;
  await fetchData();
}, 600);

const getPermissionIcon = (permission: string) => {
  if (permission === "10") return CrownOutlined;
  if (permission === "7") return TeamOutlined;
  if (permission === "5") return TeamOutlined;
  if (permission === "1") return UserOutlined;
  return TeamOutlined;
};

const getPermissionColor = (permission: string) => {
  if (permission === "10") return "#FF8C42";
  if (permission === "7") return "#D4AF37";
  if (permission === "5") return "#FFA500";
  if (permission === "1") return "#FFB84D";
  return "#ff8c00";
};

const toggleUserSelection = (uuid: string) => {
  const index = selectedUsers.value.indexOf(uuid);
  if (index > -1) {
    selectedUsers.value.splice(index, 1);
  } else {
    selectedUsers.value.push(uuid);
  }
};

const isUserSelected = (uuid: string) => {
  return selectedUsers.value.includes(uuid);
};

const toggleSelectAll = () => {
  if (selectedUsers.value.length === dataSource.value.length && dataSource.value.length > 0) {
    selectedUsers.value = [];
  } else {
    selectedUsers.value = dataSource.value.map(user => user.uuid);
  }
};

const getUserNameById = (uuid: string) => {
  const user = data.value?.data.find(u => u.uuid === uuid);
  return user?.userName || null;
};

// Owned Daemons Management
const availableDaemons = ref<any[]>([]);
const ownedDaemonModal = ref({
  visible: false,
  mode: "add" as "add" | "edit",
  daemonId: "",
  instanceLimit: -1,
  loading: false
});

const { execute: executeRemoteNodeList } = remoteNodeList();
const { execute: executeAssignDaemon } = assignOwnedDaemon();
const { execute: executeUpdateLimit } = updateOwnedDaemonLimit();
const { execute: executeRemoveDaemon } = removeOwnedDaemon();

const loadAvailableDaemons = async () => {
  try {
    const res = await executeRemoteNodeList();
    availableDaemons.value = res.value || [];
  } catch (error: any) {
    message.error("Failed to load daemons: " + error.message);
  }
};

const showAddOwnedDaemonModal = () => {
  ownedDaemonModal.value = {
    visible: true,
    mode: "add",
    daemonId: "",
    instanceLimit: -1,
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
    loading: false
  };
};

const handleAssignDaemon = async () => {
  if (!formData.value.uuid) {
    message.error("User UUID not found");
    return;
  }

  if (!ownedDaemonModal.value.daemonId) {
    message.error("Please select a daemon");
    return;
  }

  try {
    ownedDaemonModal.value.loading = true;

    if (ownedDaemonModal.value.mode === "add") {
      const res = await executeAssignDaemon({
        data: {
          userUuid: formData.value.uuid,
          daemonId: ownedDaemonModal.value.daemonId,
          instanceLimit: ownedDaemonModal.value.instanceLimit
        }
      });

      if (res.value?.success) {
        message.success("Daemon assigned successfully");
        // Add to formData owned daemons list
        if (!formData.value.ownedDaemons) {
          formData.value.ownedDaemons = [];
        }
        formData.value.ownedDaemons.push(res.value.ownedDaemon);
        ownedDaemonModal.value.visible = false;
      } else {
        message.error(res.value?.error || "Failed to assign daemon");
      }
    } else {
      const res = await executeUpdateLimit({
        data: {
          userUuid: formData.value.uuid,
          daemonId: ownedDaemonModal.value.daemonId,
          instanceLimit: ownedDaemonModal.value.instanceLimit
        }
      });

      if (res.value?.success) {
        message.success("Instance limit updated successfully");
        // Update in formData
        const ownedDaemon = formData.value.ownedDaemons?.find(
          (od: any) => od.daemonId === ownedDaemonModal.value.daemonId
        );
        if (ownedDaemon) {
          ownedDaemon.instanceLimit = ownedDaemonModal.value.instanceLimit;
        }
        ownedDaemonModal.value.visible = false;
      } else {
        message.error(res.value?.error || "Failed to update limit");
      }
    }
  } catch (error: any) {
    message.error(error.message || "Operation failed");
  } finally {
    ownedDaemonModal.value.loading = false;
  }
};

const handleRemoveOwnedDaemon = async (daemonId: string) => {
  if (!formData.value.uuid) return;

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
            userUuid: formData.value.uuid,
            daemonId
          }
        });

        if (res.value?.success) {
          message.success("Daemon removed successfully");
          // Remove from formData
          if (formData.value.ownedDaemons) {
            formData.value.ownedDaemons = formData.value.ownedDaemons.filter(
              (od: any) => od.daemonId !== daemonId
            );
          }
        } else {
          message.error(res.value?.error || "Failed to remove daemon");
        }
      } catch (error: any) {
        message.error(error.message || "Failed to remove daemon");
      }
    }
  });
};

const getInstanceCount = (daemonId: string) => {
  if (!formData.value.instances) return 0;
  return formData.value.instances.filter((inst: any) => inst.daemonId === daemonId).length;
};

onMounted(async () => {
  fetchData();
});
</script>

<template>
  <!-- User Dialog Modal -->
  <a-modal
    v-model:open="userDialog.status"
    centered
    :destroy-on-close="true"
    :footer="null"
    :width="1400"
    class="industrial-modal"
    @cancel="userDialog.status = false"
  >
    <template #title>
      <div class="modal-header-industrial">
        <div class="header-icon-industrial">
          <EditOutlined />
        </div>
        <div class="header-content-industrial">
          <h3>{{ userDialog.title }}</h3>
          <span class="header-subtitle-industrial">
            Modify user settings and permissions
          </span>
        </div>
      </div>
    </template>

    <a-form
      ref="formRef"
      :rules="formRules"
      :model="formData"
      layout="vertical"
      class="industrial-form"
    >
      <!-- Account Information Section -->
      <div class="user-settings-card">
        <div class="section-header-industrial">
          <div class="section-icon">
            <IdcardOutlined />
          </div>
          <div class="section-title">
            <h4>Account Information</h4>
            <span>Basic user credentials and role</span>
          </div>
        </div>
        <div class="form-grid">
          <!-- Row 1 -->
          <a-form-item required name="permission" class="form-field">
            <template #label>
              <span class="field-label">{{ t("TXT_CODE_511aea70") }}</span>
            </template>
            <a-select v-model:value="formData.permission" size="large" style="width: 100%">
              <a-select-option v-for="(item, key, i) in availablePermissions" :key="i" :value="Number(key)">
                {{ item }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item required name="userName" class="form-field">
            <template #label>
              <span class="field-label">{{ t("TXT_CODE_eb9fcdad") }}</span>
              <span class="field-hint">{{ t("TXT_CODE_1987587b") }}</span>
            </template>
            <a-input v-model:value="formData.userName" :placeholder="t('TXT_CODE_4ea93630')" size="large" />
          </a-form-item>

          <a-form-item class="form-field">
            <template #label>
              <span class="field-label">APIKEY</span>
              <span class="field-hint">API authentication key</span>
            </template>
            <a-input v-if="formData.apiKey" v-model:value="formData.apiKey" :readonly="true" size="large" />
            <div v-else class="empty-field">{{ t("TXT_CODE_6c274bdc") }}</div>
          </a-form-item>
        </div>
      </div>

      <!-- Profile Information Section (for existing users with email) -->
      <div v-if="formData.email || formData.firstName || formData.lastName" class="user-settings-card">
        <div class="section-header-industrial">
          <div class="section-icon">
            <MailOutlined />
          </div>
          <div class="section-title">
            <h4>Profile Information</h4>
            <span>Email registration details</span>
          </div>
        </div>
        <div class="form-grid">
          <a-form-item v-if="formData.email" class="form-field">
            <template #label>
              <span class="field-label">Email</span>
              <span class="field-hint">
                <span v-if="formData.emailVerified" style="color: #52c41a;">✓ Verified</span>
                <span v-else style="color: #faad14;">○ Not verified</span>
              </span>
            </template>
            <a-input :value="formData.email" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.accountStatus" class="form-field">
            <template #label>
              <span class="field-label">Account Status</span>
            </template>
            <a-tag :color="formData.accountStatus === 'active' ? 'green' : formData.accountStatus === 'suspended' ? 'red' : 'orange'">
              {{ formData.accountStatus }}
            </a-tag>
          </a-form-item>

          <a-form-item v-if="formData.firstName" class="form-field">
            <template #label>
              <span class="field-label">First Name</span>
            </template>
            <a-input :value="formData.firstName" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.lastName" class="form-field">
            <template #label>
              <span class="field-label">Last Name</span>
            </template>
            <a-input :value="formData.lastName" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.location" class="form-field">
            <template #label>
              <span class="field-label">Location</span>
            </template>
            <a-input :value="formData.location" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.createdIp" class="form-field">
            <template #label>
              <span class="field-label">Registration IP</span>
            </template>
            <a-input :value="formData.createdIp" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.lastLoginIp" class="form-field">
            <template #label>
              <span class="field-label">Last Login IP</span>
            </template>
            <a-input :value="formData.lastLoginIp" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.fingerprintHash" class="form-field">
            <template #label>
              <span class="field-label">Device ID (Fingerprint)</span>
            </template>
            <a-input :value="formData.fingerprintHash" :readonly="true" size="large" />
          </a-form-item>

          <a-form-item v-if="formData.trackingCookie" class="form-field">
            <template #label>
              <span class="field-label">Cookie ID (Tracking)</span>
            </template>
            <a-input :value="formData.trackingCookie" :readonly="true" size="large" />
          </a-form-item>
        </div>
      </div>

      <!-- Sub-Users Section (Edit Mode Only) -->
      <div v-if="formData.subUsers && formData.subUsers.length > 0" class="user-settings-card">
        <div class="section-header-industrial">
          <div class="section-icon">
            <TeamOutlined />
          </div>
          <div class="section-title">
            <h4>Sub-Users ({{ formData.subUsers.length }})</h4>
            <span>Permissions are managed per-instance from the Sub-User Manager</span>
          </div>
        </div>
        <div class="sub-users-grid">
          <div
            v-for="item in formData.subUsers"
            :key="item.uuid"
            class="sub-user-card-modern"
          >
            <div class="sub-user-avatar">
              <UserOutlined />
            </div>
            <div class="sub-user-details">
              <div class="sub-user-name">{{ getUserNameById(item.uuid) || 'Unknown' }}</div>
              <div class="sub-user-instance">Instance: {{ item.instanceUuid.substring(0, 8) }}...</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Owned Daemons Section (Admin Only) -->
      <div v-if="currentUserPermission >= 10" class="user-settings-card">
        <div class="section-header-industrial">
          <div class="section-icon">
            <CloudServerOutlined />
          </div>
          <div class="section-title">
            <h4>Owned Daemons ({{ formData.ownedDaemons?.length || 0 }})</h4>
            <span>User can create instances on these nodes with limits</span>
          </div>
          <button
            type="button"
            class="btn-add-daemon"
            @click="showAddOwnedDaemonModal()"
          >
            <PlusOutlined />
            Assign Daemon
          </button>
        </div>
        <div v-if="formData.ownedDaemons && formData.ownedDaemons.length > 0" class="owned-daemons-grid">
          <div
            v-for="ownedDaemon in formData.ownedDaemons"
            :key="ownedDaemon.daemonId"
            class="owned-daemon-card"
          >
            <div class="daemon-header">
              <div class="daemon-icon">
                <CloudServerOutlined />
              </div>
              <div class="daemon-info">
                <div class="daemon-name">{{ ownedDaemon.daemonName }}</div>
                <div class="daemon-id">ID: {{ ownedDaemon.daemonId.substring(0, 8) }}...</div>
              </div>
            </div>
            <div class="daemon-stats">
              <div class="stat-item">
                <span class="stat-label">Instances:</span>
                <span class="stat-value">{{ getInstanceCount(ownedDaemon.daemonId) }} / {{ ownedDaemon.instanceLimit === -1 ? '∞' : ownedDaemon.instanceLimit }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Assigned:</span>
                <span class="stat-value">{{ new Date(ownedDaemon.assignedAt).toLocaleDateString() }}</span>
              </div>
            </div>
            <div class="daemon-actions">
              <button
                type="button"
                class="btn-daemon-edit"
                @click="showEditOwnedDaemonModal(ownedDaemon)"
              >
                <EditOutlined />
                Edit Limit
              </button>
              <button
                type="button"
                class="btn-daemon-remove"
                @click="handleRemoveOwnedDaemon(ownedDaemon.daemonId)"
              >
                <DeleteOutlined />
                Remove
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-owned-daemons">
          <CloudServerOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
          <p>No owned daemons assigned</p>
          <p class="empty-hint">Click "Assign Daemon" to give this user access to create instances on a node</p>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer-industrial">
        <button type="button" class="btn-cancel-industrial" @click="userDialog.status = false">
          Cancel
        </button>
        <button
          type="button"
          class="btn-submit-industrial"
          :disabled="userDialog.confirmBtnLoading"
          @click="userDialog.resolve()"
        >
          <span v-if="userDialog.confirmBtnLoading">Saving...</span>
          <span v-else>Save Changes</span>
        </button>
      </div>
    </a-form>
  </a-modal>

  <!-- Owned Daemon Assignment Modal -->
  <a-modal
    v-model:open="ownedDaemonModal.visible"
    :title="ownedDaemonModal.mode === 'add' ? 'Assign Daemon to User' : 'Edit Instance Limit'"
    centered
    :destroy-on-close="true"
    :width="600"
    class="industrial-modal"
    @cancel="ownedDaemonModal.visible = false"
  >
    <div class="owned-daemon-modal-content">
      <a-form layout="vertical">
        <a-form-item label="Daemon" v-if="ownedDaemonModal.mode === 'add'">
          <a-select
            v-model:value="ownedDaemonModal.daemonId"
            placeholder="Select a daemon"
            size="large"
            style="width: 100%"
          >
            <a-select-option
              v-for="daemon in availableDaemons.filter((d: any) => !formData.ownedDaemons?.some((od: any) => od.daemonId === d.uuid))"
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
          <div class="limit-input-group">
            <a-input-number
              v-model:value="ownedDaemonModal.instanceLimit"
              :min="-1"
              size="large"
              style="flex: 1;"
              :placeholder="'-1 for unlimited'"
            />
            <button
              type="button"
              class="btn-unlimited"
              @click="ownedDaemonModal.instanceLimit = -1"
            >
              Unlimited
            </button>
          </div>
          <div class="field-hint" style="margin-top: 8px;">
            Set to -1 for unlimited instances, or specify a positive number
          </div>
        </a-form-item>
      </a-form>
    </div>

    <template #footer>
      <div class="modal-footer-industrial">
        <button
          type="button"
          class="btn-cancel-industrial"
          @click="ownedDaemonModal.visible = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn-submit-industrial"
          :disabled="ownedDaemonModal.loading"
          @click="handleAssignDaemon"
        >
          <span v-if="ownedDaemonModal.loading">{{ ownedDaemonModal.mode === 'add' ? 'Assigning...' : 'Updating...' }}</span>
          <span v-else>{{ ownedDaemonModal.mode === 'add' ? 'Assign' : 'Update' }}</span>
        </button>
      </div>
    </template>
  </a-modal>

  <div class="modern-users-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-left">
        <div class="title-section">
          <TeamOutlined class="page-icon" />
          <div>
            <h1 class="page-title">{{ card.title }}</h1>
            <p class="page-subtitle">{{ total }} users registered</p>
          </div>
        </div>
      </div>
      <div class="header-right">
        <button class="action-button reload-btn" @click="reload" :disabled="getUserInfoLoading">
          <ReloadOutlined :spin="getUserInfoLoading" />
          Reload
        </button>
        <button
          class="action-button delete-btn"
          @click="handleBatchDelete"
          :disabled="selectedUsers.length === 0"
        >
          <DeleteOutlined />
          Delete Selected ({{ selectedUsers.length }})
        </button>
      </div>
    </div>

    <!-- Search & Filter Section -->
    <div class="search-section">
      <div class="search-container">
        <SearchOutlined class="search-icon" />
        <input
          v-model.trim="operationForm.name"
          type="text"
          :placeholder="t('TXT_CODE_2471b9c') || 'Search users...'"
          class="search-input"
          @input="search()"
        />
      </div>
      <select v-model="currentRole" class="role-filter" @change="search()">
        <option value="">{{ t("TXT_CODE_c48f6f64") || "All Roles" }}</option>
        <option v-for="(p, i) in PERMISSION_MAP" :key="i" :value="i">
          {{ p }}
        </option>
      </select>
    </div>

    <!-- Users Table -->
    <a-spin :spinning="data && data.pageSize == 0">
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th class="col-checkbox">
                <div class="checkbox" :class="{ checked: selectedUsers.length === dataSource.length && dataSource.length > 0 }" @click="toggleSelectAll">
                  <span v-if="selectedUsers.length === dataSource.length && dataSource.length > 0">✓</span>
                </div>
              </th>
              <th class="col-username">Username</th>
              <th class="col-email">Email</th>
              <th class="col-role">Role</th>
              <th class="col-instances">Instances</th>
              <th class="col-reg-ip">Registration IP</th>
              <th class="col-device-id">Device ID</th>
              <th class="col-cookie-id">Cookie ID</th>
              <th class="col-registered">Registered</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in dataSource"
              :key="user.uuid"
              class="user-row"
              :class="{ selected: isUserSelected(user.uuid) }"
            >
              <td class="col-checkbox">
                <div class="checkbox" :class="{ checked: isUserSelected(user.uuid) }" @click.stop="toggleUserSelection(user.uuid)">
                  <span v-if="isUserSelected(user.uuid)">✓</span>
                </div>
              </td>
              <td class="col-username">
                <div class="username-cell">
                  <div class="user-avatar-small" :style="{ borderColor: getPermissionColor(String(user.permission)) }">
                    <component :is="getPermissionIcon(String(user.permission))" />
                  </div>
                  <span class="username-text">{{ user.userName }}</span>
                </div>
              </td>
              <td class="col-email">
                <span class="email-text">{{ user.email || 'N/A' }}</span>
              </td>
              <td class="col-role">
                <div class="role-badge" :style="{
                  backgroundColor: `${getPermissionColor(String(user.permission))}15`,
                  color: getPermissionColor(String(user.permission))
                }">
                  {{ PERMISSION_MAP[user.permission] || user.permission }}
                </div>
              </td>
              <td class="col-instances">
                <span class="instance-count">{{ user.instances?.length || 0 }}</span>
              </td>
              <td class="col-reg-ip">
                <span class="ip-text">{{ user.createdIp || 'N/A' }}</span>
              </td>
              <td class="col-device-id">
                <span class="device-id-text">{{ user.fingerprintHash || 'N/A' }}</span>
              </td>
              <td class="col-cookie-id">
                <span class="cookie-id-text">{{ user.trackingCookie || 'N/A' }}</span>
              </td>
              <td class="col-registered">
                <span class="date-text">{{ user.registerTime || 'N/A' }}</span>
              </td>
              <td class="col-actions">
                <button class="action-btn" @click.stop="() => { actionModalUser = user; actionModalOpen = true; }">
                  <MoreOutlined />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </a-spin>

    <!-- Pagination -->
    <div class="pagination-container" v-if="total > operationForm.pageSize">
      <a-pagination
        v-model:current="operationForm.currentPage"
        :total="total"
        :page-size="operationForm.pageSize"
        :show-size-changer="false"
        @change="handleTableChange"
      />
    </div>
  </div>

  <!-- Action Modal -->
  <a-modal
    v-model:open="actionModalOpen"
    :title="actionModalUser ? `${actionModalUser.userName}` : ''"
    :footer="null"
    centered
    width="400px"
  >
    <div v-if="actionModalUser" class="action-modal-content">
      <button class="action-modal-btn edit-btn" @click="handleEditUser(actionModalUser)">
        <EditOutlined class="action-icon" />
        <span>{{ t("TXT_CODE_236f70aa") || "Edit User" }}</span>
      </button>

      <button class="action-modal-btn resources-btn" @click="handleToUserResources(actionModalUser)">
        <DatabaseOutlined class="action-icon" />
        <span>{{ t("TXT_CODE_4d934e3a") || "Manage Resources" }}</span>
      </button>

      <button class="action-modal-btn delete-btn" @click="showDeleteConfirm(actionModalUser)">
        <DeleteOutlined class="action-icon" />
        <span>{{ t("TXT_CODE_ecbd7449") || "Delete User" }}</span>
      </button>
    </div>
  </a-modal>

</template>

<style lang="scss" scoped>
// Theme Variables - Gold/Orange Industrial Theme
:root {
  --theme-card-bg: var(--color-bg-2);
  --theme-card-bg-hover: var(--color-bg-3);
  --theme-card-border: var(--color-border-2);
  --theme-card-border-hover: #ff8c00;
  --theme-title-color: var(--color-text-1);
  --theme-subtitle-color: var(--color-text-3);
  --theme-label-color: var(--color-text-2);
  --theme-hint-color: var(--color-text-3);
  --theme-shadow: rgba(0, 0, 0, 0.1);
  --theme-shadow-hover: rgba(255, 140, 0, 0.15);
}

/* Industrial Modal Styles */
.modal-header-industrial {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-industrial {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

.header-content-industrial h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.header-subtitle-industrial {
  font-size: 13px;
  color: var(--color-text-3);
}

.section-header-industrial {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid var(--theme-card-border);
  background: var(--color-bg-3);
}

.section-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
}

.section-title h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
}

.section-title span {
  font-size: 12px;
  color: var(--color-text-3);
}

.modal-footer-industrial {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  margin-top: 8px;
  background: var(--color-bg-3);
  border-top: 1px solid var(--theme-card-border);
  border-radius: 0 0 12px 12px;
}

.btn-cancel-industrial {
  padding: 10px 24px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  color: var(--color-text-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel-industrial:hover {
  background: var(--color-bg-4);
}

.btn-submit-industrial {
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

.btn-submit-industrial:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
}

.btn-submit-industrial:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.industrial-form {
  padding: 8px 0;
}

.modern-users-page {
  padding: 24px;
  min-height: 100vh;
  background: var(--background-color);
}

// Page Header
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  box-shadow: 0 8px 20px rgba(255, 140, 66, 0.3);
}

.page-title {
  font-size: 32px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 14px;
  color: var(--color-gray-7);
  margin: 4px 0 0 0;
}

.header-right {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-button {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    transform: translateY(-2px);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }
}

.reload-btn {
  background: var(--background-color-white);
  color: var(--text-color);
  border: 2px solid var(--card-border-color);

  &:hover:not(:disabled) {
    border-color: #FF8C42;
    color: #FF8C42;
    background: rgba(255, 140, 66, 0.1);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.2);
  }
}

.add-btn {
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  color: white;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 24px rgba(255, 140, 66, 0.4);
  }
}

.delete-btn {
  background: var(--color-red-5);
  color: white;
  box-shadow: 0 4px 16px rgba(255, 77, 79, 0.3);

  &:hover:not(:disabled) {
    background: var(--color-red-4);
    box-shadow: 0 6px 24px rgba(255, 77, 79, 0.4);
  }
}

// Search Section
.search-section {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
}

.search-container {
  flex: 1;
  position: relative;
  max-width: 600px;
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20px;
  color: #FF8C42;
}

.search-input {
  width: 100%;
  padding: 16px 20px 16px 56px;
  border: 2px solid var(--card-border-color);
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: var(--background-color-white);
  color: var(--text-color);

  &:focus {
    outline: none;
    border-color: #FF8C42;
    background: var(--background-color-white);
    box-shadow: 0 0 0 4px rgba(255, 140, 66, 0.1);
  }

  &::placeholder {
    color: var(--color-gray-7);
  }
}

.role-filter {
  padding: 16px 20px;
  border: 2px solid var(--card-border-color);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  background: var(--background-color-white);
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #FF8C42;
    background: var(--background-color-white);
    box-shadow: 0 0 0 4px rgba(255, 140, 66, 0.1);
  }

  &:hover {
    border-color: #FF8C42;
  }
}

// Users Grid
// Users Table
.users-table-container {
  background: var(--background-color-white);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px var(--card-shadow-color);
  margin-bottom: 32px;
  border: 1px solid var(--card-border-color);
}

.users-table {
  width: 100%;
  border-collapse: collapse;

  thead {
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.08), rgba(212, 175, 55, 0.08));
    border-bottom: 2px solid #FF8C42;

    tr th {
      padding: 16px 12px;
      text-align: left;
      font-weight: 700;
      font-size: 13px;
      color: var(--text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;

      &.col-checkbox {
        width: 50px;
        text-align: center;
      }

      &.col-username {
        min-width: 200px;
      }

      &.col-email {
        min-width: 200px;
      }

      &.col-role {
        width: 140px;
      }

      &.col-instances {
        width: 100px;
        text-align: center;
      }

      &.col-reg-ip {
        min-width: 140px;
      }

      &.col-device-id {
        min-width: 120px;
      }

      &.col-cookie-id {
        min-width: 120px;
      }

      &.col-registered {
        min-width: 160px;
      }

      &.col-actions {
        width: 80px;
        text-align: center;
      }
    }
  }

  tbody {
    tr.user-row {
      border-bottom: 1px solid var(--card-border-color);
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 140, 66, 0.04);
      }

      &.selected {
        background: linear-gradient(135deg, rgba(255, 140, 66, 0.08), rgba(212, 175, 55, 0.08));
      }

      td {
        padding: 14px 12px;
        vertical-align: middle;
        font-size: 13px;
        color: var(--text-color);

        &.col-checkbox {
          text-align: center;
        }

        &.col-instances {
          text-align: center;
        }

        &.col-actions {
          text-align: center;
        }
      }
    }
  }
}

.checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid var(--card-border-color);
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: var(--background-color);
  cursor: pointer;

  &.checked {
    background: linear-gradient(135deg, #FF8C42, #FF6B35);
    border-color: #FF8C42;
    color: white;
  }

  &:hover {
    border-color: #FF8C42;
  }
}

.username-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar-small {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
  border: 2px solid;
  flex-shrink: 0;
}

.username-text {
  font-weight: 600;
  color: var(--text-color);
}

.email-text {
  color: var(--color-gray-7);
  font-family: monospace;
  font-size: 12px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.instance-count {
  font-weight: 600;
  color: #FF8C42;
  background: rgba(255, 140, 66, 0.1);
  padding: 4px 10px;
  border-radius: 8px;
  display: inline-block;
}

.ip-text {
  font-family: monospace;
  font-size: 12px;
  color: #48bb78;
  font-weight: 500;
}

.device-id-text {
  font-family: monospace;
  font-size: 11px;
  color: #FF8C42;
  font-weight: 500;
}

.cookie-id-text {
  font-family: monospace;
  font-size: 11px;
  color: #667eea;
  font-weight: 500;
}

.date-text {
  color: var(--color-gray-7);
  font-size: 12px;
}

.action-btn {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.1), rgba(212, 175, 55, 0.1));
  border: 2px solid #FF8C42;
  border-radius: 12px;
  color: #FF8C42;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.1);

  &:hover {
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.25), rgba(212, 175, 55, 0.25));
    box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);
    border-color: #FF6B35;
  }

  &:active {
    box-shadow: 0 1px 4px rgba(255, 140, 66, 0.2);
  }
}

// Action Modal
.action-modal-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.action-modal-btn {
  width: 100%;
  padding: 16px 20px;
  border: 2px solid;
  border-radius: 12px;
  background: transparent;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;

  .action-icon {
    font-size: 20px;
  }

  &.edit-btn {
    border-color: rgba(255, 140, 0, 0.3);
    color: var(--color-blue-6);

    &:hover {
      background: rgba(255, 140, 0, 0.12);
      border-color: var(--color-blue-6);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 140, 0, 0.2);
    }
  }

  &.resources-btn {
    border-color: rgba(82, 196, 26, 0.3);
    color: var(--color-green-6);

    &:hover {
      background: rgba(82, 196, 26, 0.12);
      border-color: var(--color-green-6);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(82, 196, 26, 0.2);
    }
  }

  &.delete-btn {
    border-color: rgba(255, 77, 79, 0.3);
    color: var(--color-red-6);

    &:hover {
      background: rgba(255, 77, 79, 0.12);
      border-color: var(--color-red-6);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 77, 79, 0.2);
    }
  }

  &:active {
    transform: translateY(0);
  }
}

// Pagination
.pagination-container {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

// Responsive
@media (max-width: 1400px) {
  .users-table-container {
    overflow-x: auto;
  }

  .users-table {
    min-width: 1200px;
  }
}

@media (max-width: 768px) {
  .modern-users-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-right {
    width: 100%;

    .action-button {
      flex: 1;
      justify-content: center;
    }
  }

  .search-section {
    flex-direction: column;
  }

  .users-table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .users-table {
    min-width: 1000px;
  }

  .page-title {
    font-size: 24px;
  }

  .page-icon {
    width: 50px;
    height: 50px;
    font-size: 24px;
  }
}

// Permissions Section Styling
.permissions-section {
  :deep(.ant-form-item-label) {
    label {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-color);
    }
  }
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 16px;

  // Responsive layout for smaller screens
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.permission-category {
  background: var(--card-bottom-background-color);
  border: 2px solid var(--card-border-color);
  border-radius: 12px;
  padding: 14px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 140, 66, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.15);
  }
}

.category-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 10px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--card-border-color);
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.category-icon {
  font-size: 18px;
  color: #FF8C42;
}

.permission-items {
  display: flex;
  flex-direction: column;
  gap: 8px;

  :deep(.ant-checkbox-wrapper) {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color);
    padding: 6px 10px;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 140, 66, 0.08);
      padding-left: 14px;
    }
  }

  :deep(.ant-checkbox) {
    .ant-checkbox-inner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--card-border-color);
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    &:hover .ant-checkbox-inner {
      border-color: #FF8C42;
    }

    &.ant-checkbox-checked {
      .ant-checkbox-inner {
        background: linear-gradient(135deg, #FF8C42, #FF6B35);
        border-color: #FF8C42;
      }

      &::after {
        border-color: #FF8C42;
      }
    }
  }
}

// Make modal wider to accommodate permissions (landscape layout)
:deep(.ant-modal) {
  max-width: 1400px;
  width: 95% !important;
}

/* LANDSCAPE User Permission Cards - ORANGE GOLD BLACK THEME */
.user-info-card {
  background: linear-gradient(135deg, #1a1a00 0%, #2a2200 100%);
  border: 2px solid #ff8c00;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.user-info-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.user-info-content {
  flex: 1;
}

.user-info-text {
  margin: 0 0 4px 0;
  padding: 0;
  font-size: 13px;
  color: #ffd700; /* GOLD */
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
}

.user-info-link {
  color: #ff8c00; /* ORANGE */
  text-decoration: underline;

  &:hover {
    color: #ffa500; /* Lighter ORANGE */
  }
}

.user-settings-card {
  background: var(--theme-card-bg);
  border: 2px solid var(--theme-card-border);
  border-radius: 12px;
  padding: 0; /* Content areas handle their own padding */
  margin-bottom: 16px;
  overflow: hidden; /* Clip content to border radius */
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--theme-card-border-hover);
    background: var(--theme-card-bg-hover);
    box-shadow: 0 4px 16px var(--theme-shadow-hover);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

/* Form Grid - 2 column layout */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  padding: 24px;
}

.form-field {
  margin-bottom: 0 !important;

  .ant-form-item-label {
    padding-bottom: 8px;

    > label {
      height: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;

      &::after {
        display: none;
      }
    }
  }
}

.field-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
  line-height: 1.4;
}

.field-hint {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-3);
  line-height: 1.4;
}

.empty-field {
  padding: 8px 12px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  color: var(--color-text-3);
  font-style: italic;
  font-size: 14px;
}

/* Responsive */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
}

/* Customize Ant Design for ORANGE GOLD BLACK theme */
:deep(.user-settings-card) {
  .ant-input:hover,
  .ant-input:focus {
    border-color: var(--theme-card-border-hover);
  }

  .ant-input:focus {
    box-shadow: 0 0 0 2px var(--theme-focus-shadow);
  }

  .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
  .ant-select-focused:not(.ant-select-disabled).ant-select .ant-select-selector {
    border-color: var(--theme-card-border-hover);
  }

  .ant-select-focused:not(.ant-select-disabled).ant-select .ant-select-selector {
    box-shadow: 0 0 0 2px var(--theme-focus-shadow);
  }

  .ant-checkbox-wrapper:hover .ant-checkbox-inner {
    border-color: var(--theme-card-border-hover);
  }

  .ant-checkbox-checked .ant-checkbox-inner {
    background: var(--theme-card-border-hover);
    border-color: var(--theme-card-border-hover);
  }
}

.sub-users-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
  background: rgba(255, 140, 0, 0.1);
  color: #ff8c00;
  border: 1px solid rgba(255, 140, 0, 0.3);
}

/* Modern Sub-User Cards */
.sub-users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  padding: 20px; /* Consistent with other sections */
}

.sub-user-card-modern {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.sub-user-card-modern:hover {
  border-color: #ff8c00;
  box-shadow: 0 2px 8px rgba(255, 140, 0, 0.15);
}

.sub-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
}

.sub-user-details {
  flex: 1;
  min-width: 0;
}

.sub-user-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-user-instance {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}

.sub-user-card-modern.clickable {
  cursor: pointer;
}

.sub-user-edit-icon {
  color: var(--color-text-3);
  font-size: 14px;
  opacity: 0;
  transition: all 0.2s ease;
}

.sub-user-card-modern.clickable:hover .sub-user-edit-icon {
  opacity: 1;
  color: #ff8c00;
}

/* Sub-User Permissions Modal */
.sub-user-permissions-content {
  padding: 16px 0;
}

.sub-user-permissions-content .permission-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-bg-3);
  border-radius: 8px;
  border: 1px solid var(--color-border-2);
}

.sub-user-permissions-content .permission-section.security-section {
  border-color: rgba(250, 173, 20, 0.3);
  background: rgba(250, 173, 20, 0.05);
}

.sub-user-permissions-content .section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--color-text-1);
}

.sub-user-permissions-content .permissions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sub-user-permissions-content .permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.sub-user-permissions-content .permission-item:hover {
  border-color: #ff8c00;
}

.sub-user-permissions-content .permission-item.active {
  border-color: #ff8c00;
  background: rgba(255, 140, 0, 0.1);
}

.sub-user-permissions-content .permission-item.restriction.active {
  border-color: #faad14;
  background: rgba(250, 173, 20, 0.15);
}

.sub-user-permissions-content .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-2);
}

.sub-user-permissions-content .btn-cancel {
  padding: 8px 16px;
  border: 1px solid var(--color-border-2);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-2);
  transition: all 0.2s ease;
}

.sub-user-permissions-content .btn-cancel:hover {
  border-color: var(--color-text-3);
}

.sub-user-permissions-content .btn-save {
  padding: 8px 16px;
  border: none;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
}

.sub-user-permissions-content .btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

.sub-user-permissions-content .btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ========================================
   ULTRA INDUSTRIAL PERMISSIONS GRID
   ======================================== */

.permissions-grid-ultra {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 20px; /* Consistent with account info section */
}

.permission-category-ultra {
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 140, 0, 0.4);
    box-shadow: 0 4px 16px rgba(255, 140, 0, 0.1);
  }

  &.security {
    border-color: rgba(250, 173, 20, 0.3);
    background: rgba(250, 173, 20, 0.05);

    &:hover {
      border-color: rgba(250, 173, 20, 0.5);
      box-shadow: 0 4px 16px rgba(250, 173, 20, 0.15);
    }
  }
}

.category-header-ultra {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-2);
}

.category-icon-ultra {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);

  &.warning {
    background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
    box-shadow: 0 4px 12px rgba(250, 173, 20, 0.3);
  }
}

.category-info-ultra {
  flex: 1;
  min-width: 0;

  h4 {
    margin: 0 0 4px 0;
    padding: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-1);
    line-height: 1.3;
  }

  span {
    font-size: 12px;
    color: var(--color-text-3);
    line-height: 1.4;
  }
}

.permission-cards-ultra {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-card-ultra {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover {
    border-color: #ff8c00;
    background: rgba(255, 140, 0, 0.08);
  }

  &.active {
    border-color: #ff8c00;
    background: rgba(255, 140, 0, 0.15);
    box-shadow: 0 2px 8px rgba(255, 140, 0, 0.2);

    .perm-label {
      color: #ff8c00;
      font-weight: 600;
    }
  }

  &.restriction {
    &:hover {
      border-color: #faad14;
      background: rgba(250, 173, 20, 0.08);
    }

    &.active {
      border-color: #faad14;
      background: rgba(250, 173, 20, 0.15);
      box-shadow: 0 2px 8px rgba(250, 173, 20, 0.2);

      .perm-label {
        color: #faad14;
      }
    }
  }

  :deep(.ant-checkbox) {
    .ant-checkbox-inner {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }
  }
}

.perm-label {
  font-size: 13px;
  color: var(--color-text-2);
  line-height: 1;
  white-space: nowrap;
  transition: all 0.2s ease;
}

/* Responsive for permissions grid */
@media (max-width: 768px) {
  .permissions-grid-ultra {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }

  .permission-category-ultra {
    padding: 12px;
  }

  .category-icon-ultra {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .permission-cards-ultra {
    gap: 6px;
  }

  .permission-card-ultra {
    padding: 6px 10px;
    gap: 6px;

    .perm-label {
      font-size: 12px;
    }
  }
}

// Owned Daemons Styles
.btn-add-daemon {
  background: #ff8c00;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: #ff9d1f;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.owned-daemons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.owned-daemon-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;

  &:hover {
    border-color: #ff8c00;
    box-shadow: 0 4px 12px rgba(255, 140, 0, 0.15);
  }

  .daemon-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .daemon-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #ff8c00, #ff9d1f);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
  }

  .daemon-info {
    flex: 1;

    .daemon-name {
      font-weight: 600;
      font-size: 16px;
      color: var(--color-text-1);
      margin-bottom: 4px;
    }

    .daemon-id {
      font-size: 12px;
      color: var(--color-text-3);
    }
  }

  .daemon-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--color-bg-1);
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .stat-label {
      font-size: 12px;
      color: var(--color-text-3);
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-1);
    }
  }

  .daemon-actions {
    display: flex;
    gap: 8px;
  }

  .btn-daemon-edit,
  .btn-daemon-remove {
    flex: 1;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid var(--color-border-2);
    background: var(--color-bg-2);
    color: var(--color-text-1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  .btn-daemon-edit:hover {
    border-color: #ff8c00;
    color: #ff8c00;
    background: rgba(255, 140, 0, 0.05);
  }

  .btn-daemon-remove:hover {
    border-color: #ff4d4f;
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.05);
  }
}

.empty-owned-daemons {
  text-align: center;
  padding: 48px 24px;
  color: var(--color-text-3);

  p {
    margin: 0;
    font-size: 14px;
  }

  .empty-hint {
    font-size: 12px;
    color: var(--color-text-4);
    margin-top: 8px;
  }
}

.owned-daemon-modal-content {
  padding: 16px 0;
}

.limit-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-unlimited {
  padding: 8px 16px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #ff8c00;
    color: #ff8c00;
    background: rgba(255, 140, 0, 0.05);
  }
}
</style>
