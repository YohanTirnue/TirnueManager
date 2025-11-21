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
  PlusOutlined,
  ReloadOutlined,
  CrownOutlined,
  TeamOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  ControlOutlined,
  SettingOutlined
} from "@ant-design/icons-vue";
import type { Rule } from "ant-design-vue/es/form";
import { throttle } from "lodash";
import CardPanel from "@/components/CardPanel.vue";
import { arrayFilter } from "../tools/array";
import { useAppRouters } from "@/hooks/useAppRouters";
import {
  getUserInfo,
  deleteUser as deleteUserApi,
  addUser as addUserApi,
  editUserInfo,
  updateSubUserPermissions
} from "@/services/apis";
import type { UserPermissions } from "@/types/user";
import type { LayoutCard } from "@/types/index";
import type { BaseUserInfo, EditUserInfo } from "@/types/user";
import _ from "lodash";
import { PASSWORD_REGEX } from "../tools/validator";
import { PERMISSION_MAP } from "@/config/const";
import { reportErrorMsg } from "@/tools/validator";

defineProps<{
  card: LayoutCard;
}>();

interface dataType {
  total: number;
  pageSize: number;
  page: number;
  maxPage: number;
  data: BaseUserInfo[];
}

const { execute, isLoading: getUserInfoLoading } = getUserInfo();
const { toPage } = useAppRouters();

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

const isAddMode = ref(true);
const userDialog = ref({
  status: false,
  title: t("TXT_CODE_e83ffa03"),
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
      if (isAddMode.value) {
        await addUserApi().execute({
          data: {
            username: formData.value.userName,
            password: formData.value.passWord!,
            permission: formData.value.permission,
            permissions: formData.value.permissions ?? {
              canUploadFiles: true,
              canDownloadFiles: true,
              canDeleteFiles: true,
              canModifyFiles: true,
              canAccessConsole: true,
              canStartInstances: true,
              canRestartInstances: true,
              canStopInstances: true,
              canTerminateInstances: false,
              canViewLogs: true,
              canAccessConfigFiles: true,
              canAccessFileManager: true,
              canAccessMinecraftQuery: true,
              canAccessTerminalSettings: true,
              canAccessScheduledTasks: true,
              canAccessEventTasks: true,
              canAccessInstanceSettings: true,
              canAccessServerMarket: true,
              disableRightClick: false,
              disableKeyboardShortcuts: false,
              disableTextSelection: false,
              disableCopy: false,
              disablePaste: false
            }
          }
        });
        message.success(t("TXT_CODE_c855fc29"));
      } else {
        await editUserInfo().execute({
          data: {
            config: formData.value,
            uuid: formData.value.uuid
          }
        });
        message.success(t("TXT_CODE_27efac3b"));
      }
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
  permissions: {
    canUploadFiles: true,
    canDownloadFiles: true,
    canDeleteFiles: true,
    canModifyFiles: true,
    canAccessConsole: true,
    canStartInstances: true,
    canRestartInstances: true,
    canStopInstances: true,
    canTerminateInstances: false,
    canViewLogs: true,
    canAccessConfigFiles: true,
    canAccessFileManager: true,
    canAccessMinecraftQuery: true,
    canAccessTerminalSettings: true,
    canAccessScheduledTasks: true,
    canAccessEventTasks: true,
    canAccessInstanceSettings: true,
    canAccessServerMarket: true,
    disableRightClick: false,
    disableKeyboardShortcuts: false,
    disableTextSelection: false,
    disableCopy: false,
    disablePaste: false
  }
};

const formRef = ref<FormInstance>();
const formData = ref<EditUserInfo>(_.cloneDeep(formDataOrigin));
const baseRules: Record<string, Rule[]> = {
  userName: [
    { required: true, message: t("TXT_CODE_2695488c") },
    { min: 3, max: 20, message: t("TXT_CODE_3f477ec"), trigger: "blur" }
  ],
  permission: [{ required: true, message: t("TXT_CODE_3bb646e4") }]
};
const addUserRules: Record<string, Rule[]> = {
  ...baseRules,
  passWord: [
    {
      min: 9,
      max: 36,
      validator: async (_rule: Rule, value: string) => {
        if (!PASSWORD_REGEX.test(value)) throw new Error(t("TXT_CODE_6032f5a3"));
      },
      trigger: "blur"
    }
  ]
};
const editUserRules: Record<string, Rule[]> = {
  ...baseRules,
  passWord: [
    {
      required: false
    },
    {
      min: 9,
      max: 36,
      validator: async (_rule: Rule, value: string) => {
        if (value && !PASSWORD_REGEX.test(value)) throw new Error(t("TXT_CODE_6032f5a3"));
      },
      trigger: "blur"
    }
  ]
};

const handleAddUser = async () => {
  userDialog.value.title = t("TXT_CODE_e83ffa03");
  formData.value = _.cloneDeep(formDataOrigin);
  isAddMode.value = true;
  userDialog.value.show();
};

const handleEditUser = (user: BaseUserInfo) => {
  userDialog.value.title = t("TXT_CODE_79f9a172");
  const clonedUser = _.cloneDeep(user);

  // Ensure permissions object exists for backward compatibility
  // Merge with defaults to handle both missing and partial permissions objects
  if (!clonedUser.permissions) {
    clonedUser.permissions = _.cloneDeep(formDataOrigin.permissions!);
  } else {
    // Merge existing permissions with defaults to ensure all fields exist
    clonedUser.permissions = {
      ...formDataOrigin.permissions!,
      ...clonedUser.permissions
    };
  }

  formData.value = clonedUser;
  isAddMode.value = false;
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
  if (permission === "1") return UserOutlined;
  return TeamOutlined;
};

const getPermissionColor = (permission: string) => {
  if (permission === "10") return "#FF8C42";
  if (permission === "1") return "#ffa500";
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

const getUserNameById = (uuid: string) => {
  const user = data.value?.data.find(u => u.uuid === uuid);
  return user?.userName || null;
};

// Sub-user permissions edit dialog
const subUserDialog = ref({
  visible: false,
  loading: false,
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

const handleEditSubUser = (subUserUuid: string) => {
  const subUser = data.value?.data.find(u => u.uuid === subUserUuid);
  if (!subUser) {
    message.error("Sub-user not found");
    return;
  }

  subUserDialog.value.uuid = subUser.uuid;
  subUserDialog.value.userName = subUser.userName;
  subUserDialog.value.permissions = subUser.permissions ? _.cloneDeep(subUser.permissions) : {
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
  subUserDialog.value.visible = true;
};

const saveSubUserPermissions = async () => {
  try {
    subUserDialog.value.loading = true;
    await updateSubUserPermissions().execute({
      params: {
        subUserUuid: subUserDialog.value.uuid
      },
      data: {
        permissions: subUserDialog.value.permissions
      }
    });
    message.success("Sub-user permissions updated");
    subUserDialog.value.visible = false;
    await fetchData();
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    subUserDialog.value.loading = false;
  }
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
          <UserOutlined v-if="isAddMode" />
          <EditOutlined v-else />
        </div>
        <div class="header-content-industrial">
          <h3>{{ userDialog.title }}</h3>
          <span class="header-subtitle-industrial">
            {{ isAddMode ? 'Create a new user account' : 'Modify user settings and permissions' }}
          </span>
        </div>
      </div>
    </template>

    <a-form
      ref="formRef"
      :rules="isAddMode ? addUserRules : editUserRules"
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
              <a-select-option v-for="(item, key, i) in PERMISSION_MAP" :key="i" :value="Number(key)">
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

          <!-- Row 2 -->
          <a-form-item :required="isAddMode" name="passWord" class="form-field">
            <template #label>
              <span class="field-label">{{ t("TXT_CODE_551b0348") }}</span>
              <span class="field-hint">{{ !isAddMode ? 'Leave blank to keep unchanged' : t("TXT_CODE_1f2062c7") }}</span>
            </template>
            <a-input-password v-model:value="formData.passWord" :placeholder="t('TXT_CODE_4ea93630')" size="large" />
          </a-form-item>

          <a-form-item v-if="!isAddMode" class="form-field">
            <template #label>
              <span class="field-label">APIKEY</span>
              <span class="field-hint">API authentication key</span>
            </template>
            <a-input v-if="formData.apiKey" v-model:value="formData.apiKey" :readonly="true" size="large" />
            <div v-else class="empty-field">{{ t("TXT_CODE_6c274bdc") }}</div>
          </a-form-item>
        </div>
      </div>

      <!-- User Permissions Card -->
      <div class="user-settings-card">
        <div class="section-header-industrial">
          <div class="section-icon">
            <SafetyOutlined />
          </div>
          <div class="section-title">
            <h4>Access Control & Security</h4>
            <span>Configure specific permissions for this user</span>
          </div>
        </div>
        <div class="permissions-grid-ultra">
            <!-- File Operations -->
            <div class="permission-category-ultra">
              <div class="category-header-ultra">
                <div class="category-icon-ultra">
                  <DatabaseOutlined />
                </div>
                <div class="category-info-ultra">
                  <h4>File Operations</h4>
                  <span>Manage file upload, download, and editing</span>
                </div>
              </div>
              <div class="permission-cards-ultra">
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canUploadFiles }">
                  <a-checkbox v-model:checked="formData.permissions!.canUploadFiles" />
                  <span class="perm-label">Upload</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canDownloadFiles }">
                  <a-checkbox v-model:checked="formData.permissions!.canDownloadFiles" />
                  <span class="perm-label">Download</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canDeleteFiles }">
                  <a-checkbox v-model:checked="formData.permissions!.canDeleteFiles" />
                  <span class="perm-label">Delete</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canModifyFiles }">
                  <a-checkbox v-model:checked="formData.permissions!.canModifyFiles" />
                  <span class="perm-label">Modify</span>
                </label>
              </div>
            </div>

            <!-- Instance Control -->
            <div class="permission-category-ultra">
              <div class="category-header-ultra">
                <div class="category-icon-ultra">
                  <ControlOutlined />
                </div>
                <div class="category-info-ultra">
                  <h4>Instance Control</h4>
                  <span>Start, stop, and manage instances</span>
                </div>
              </div>
              <div class="permission-cards-ultra">
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessConsole }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessConsole" />
                  <span class="perm-label">Console</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canStartInstances }">
                  <a-checkbox v-model:checked="formData.permissions!.canStartInstances" />
                  <span class="perm-label">Start</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canRestartInstances }">
                  <a-checkbox v-model:checked="formData.permissions!.canRestartInstances" />
                  <span class="perm-label">Restart</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canStopInstances }">
                  <a-checkbox v-model:checked="formData.permissions!.canStopInstances" />
                  <span class="perm-label">Stop</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canViewLogs }">
                  <a-checkbox v-model:checked="formData.permissions!.canViewLogs" />
                  <span class="perm-label">Logs</span>
                </label>
              </div>
            </div>

            <!-- Instance Management Access -->
            <div class="permission-category-ultra">
              <div class="category-header-ultra">
                <div class="category-icon-ultra">
                  <SettingOutlined />
                </div>
                <div class="category-info-ultra">
                  <h4>Management Access</h4>
                  <span>Advanced configuration access</span>
                </div>
              </div>
              <div class="permission-cards-ultra">
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessConfigFiles }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessConfigFiles" />
                  <span class="perm-label">Config</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessFileManager }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessFileManager" />
                  <span class="perm-label">Files</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessTerminalSettings }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessTerminalSettings" />
                  <span class="perm-label">Terminal</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessScheduledTasks }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessScheduledTasks" />
                  <span class="perm-label">Schedule</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessEventTasks }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessEventTasks" />
                  <span class="perm-label">Events</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessInstanceSettings }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessInstanceSettings" />
                  <span class="perm-label">Settings</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessMinecraftQuery }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessMinecraftQuery" />
                  <span class="perm-label">MC Query</span>
                </label>
                <label class="permission-card-ultra" :class="{ active: formData.permissions!.canAccessServerMarket }">
                  <a-checkbox v-model:checked="formData.permissions!.canAccessServerMarket" />
                  <span class="perm-label">Server Market</span>
                </label>
              </div>
            </div>

            <!-- Security Restrictions -->
            <div class="permission-category-ultra security">
              <div class="category-header-ultra">
                <div class="category-icon-ultra warning">
                  <SafetyOutlined />
                </div>
                <div class="category-info-ultra">
                  <h4>Security Restrictions</h4>
                  <span>Restrict user interactions</span>
                </div>
              </div>
              <div class="permission-cards-ultra">
                <label class="permission-card-ultra restriction" :class="{ active: formData.permissions!.disableRightClick }">
                  <a-checkbox v-model:checked="formData.permissions!.disableRightClick" />
                  <span class="perm-label">No Right-Click</span>
                </label>
                <label class="permission-card-ultra restriction" :class="{ active: formData.permissions!.disableKeyboardShortcuts }">
                  <a-checkbox v-model:checked="formData.permissions!.disableKeyboardShortcuts" />
                  <span class="perm-label">No Shortcuts</span>
                </label>
                <label class="permission-card-ultra restriction" :class="{ active: formData.permissions!.disableTextSelection }">
                  <a-checkbox v-model:checked="formData.permissions!.disableTextSelection" />
                  <span class="perm-label">No Selection</span>
                </label>
                <label class="permission-card-ultra restriction" :class="{ active: formData.permissions!.disableCopy }">
                  <a-checkbox v-model:checked="formData.permissions!.disableCopy" />
                  <span class="perm-label">No Copy</span>
                </label>
                <label class="permission-card-ultra restriction" :class="{ active: formData.permissions!.disablePaste }">
                  <a-checkbox v-model:checked="formData.permissions!.disablePaste" />
                  <span class="perm-label">No Paste</span>
                </label>
              </div>
            </div>
          </div>
      </div>

      <!-- Sub-Users Section (Edit Mode Only) -->
      <div v-if="!isAddMode && formData.subUsers && formData.subUsers.length > 0" class="user-settings-card">
        <div class="section-header-industrial">
          <div class="section-icon">
            <TeamOutlined />
          </div>
          <div class="section-title">
            <h4>Sub-Users ({{ formData.subUsers.length }})</h4>
            <span>Sub-users created by this parent user</span>
          </div>
        </div>
        <div class="sub-users-grid">
          <div
            v-for="item in formData.subUsers"
            :key="item.uuid"
            class="sub-user-card-modern clickable"
            @click="handleEditSubUser(item.uuid)"
            title="Click to edit permissions"
          >
            <div class="sub-user-avatar">
              <UserOutlined />
            </div>
            <div class="sub-user-details">
              <div class="sub-user-name">{{ getUserNameById(item.uuid) || 'Unknown' }}</div>
              <div class="sub-user-instance">Instance: {{ item.instanceUuid.substring(0, 8) }}...</div>
            </div>
            <div class="sub-user-edit-icon">
              <EditOutlined />
            </div>
          </div>
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
          <span v-else>{{ isAddMode ? 'Create User' : 'Save Changes' }}</span>
        </button>
      </div>
    </a-form>
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
        <button class="action-button add-btn" @click="handleAddUser">
          <PlusOutlined />
          Add User
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

    <!-- Users Grid -->
    <a-spin :spinning="data && data.pageSize == 0">
      <div class="users-grid">
        <div
          v-for="user in dataSource"
          :key="user.uuid"
          class="user-card"
          :class="{ selected: isUserSelected(user.uuid) }"
        >
          <!-- Selection Checkbox -->
          <div class="card-checkbox" @click.stop="toggleUserSelection(user.uuid)">
            <div class="checkbox" :class="{ checked: isUserSelected(user.uuid) }">
              <span v-if="isUserSelected(user.uuid)">✓</span>
            </div>
          </div>

          <!-- User Avatar -->
          <div class="user-avatar" :style="{ borderColor: getPermissionColor(String(user.permission)) }">
            <component :is="getPermissionIcon(String(user.permission))" />
          </div>

          <!-- User Info -->
          <div class="user-info">
            <h3 class="user-name">{{ user.userName }}</h3>
            <div class="user-badge" :style="{
              backgroundColor: `${getPermissionColor(String(user.permission))}15`,
              color: getPermissionColor(String(user.permission))
            }">
              {{ PERMISSION_MAP[user.permission] || user.permission }}
            </div>
          </div>

          <!-- User Stats -->
          <div class="user-stats">
            <div class="stat-item">
              <ClockCircleOutlined class="stat-icon" />
              <div class="stat-content">
                <span class="stat-label">Last Login</span>
                <span class="stat-value">{{ user.loginTime || 'Never' }}</span>
              </div>
            </div>
            <div class="stat-item">
              <SafetyOutlined class="stat-icon" />
              <div class="stat-content">
                <span class="stat-label">Registered</span>
                <span class="stat-value">{{ user.registerTime || 'N/A' }}</span>
              </div>
            </div>
          </div>

          <!-- Sub-Users Badge (if any) -->
          <div v-if="user.subUsers && user.subUsers.length > 0" class="sub-users-badge">
            <TeamOutlined style="margin-right: 4px" />
            <span>{{ user.subUsers.length }} Sub-User{{ user.subUsers.length > 1 ? 's' : '' }}</span>
          </div>

          <!-- UUID -->
          <div class="user-uuid">
            <span class="uuid-label">UUID:</span>
            <span class="uuid-value">{{ user.uuid }}</span>
          </div>

          <!-- Action Button -->
          <div class="action-menu-container">
            <button class="action-menu-btn" @click.stop="() => { actionModalUser = user; actionModalOpen = true; }">
              <MoreOutlined />
            </button>
          </div>
        </div>
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

  <!-- Sub-User Permissions Edit Modal -->
  <a-modal
    v-model:open="subUserDialog.visible"
    :title="'Edit Sub-User Permissions: ' + subUserDialog.userName"
    :footer="null"
    width="600px"
    class="sub-user-permissions-modal"
  >
    <div class="sub-user-permissions-content">
      <!-- Instance Control Permissions -->
      <div class="permission-section">
        <div class="section-header">
          <ControlOutlined />
          <span>Instance Control</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessConsole }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessConsole" />
            <span>Console Access</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canStartInstances }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canStartInstances" />
            <span>Start</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canStopInstances }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canStopInstances" />
            <span>Stop</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canRestartInstances }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canRestartInstances" />
            <span>Restart</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canTerminateInstances }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canTerminateInstances" />
            <span>Terminate</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canViewLogs }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canViewLogs" />
            <span>View Logs</span>
          </label>
        </div>
      </div>

      <!-- File Permissions -->
      <div class="permission-section">
        <div class="section-header">
          <SettingOutlined />
          <span>File Operations</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessFileManager }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessFileManager" />
            <span>File Manager</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canUploadFiles }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canUploadFiles" />
            <span>Upload</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canDownloadFiles }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canDownloadFiles" />
            <span>Download</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canModifyFiles }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canModifyFiles" />
            <span>Modify</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canDeleteFiles }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canDeleteFiles" />
            <span>Delete</span>
          </label>
        </div>
      </div>

      <!-- Advanced Access -->
      <div class="permission-section">
        <div class="section-header">
          <SettingOutlined />
          <span>Advanced Access</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessConfigFiles }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessConfigFiles" />
            <span>Config Files</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessMinecraftQuery }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessMinecraftQuery" />
            <span>MC Query</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessTerminalSettings }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessTerminalSettings" />
            <span>Terminal Settings</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessScheduledTasks }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessScheduledTasks" />
            <span>Scheduled Tasks</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessEventTasks }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessEventTasks" />
            <span>Event Tasks</span>
          </label>
          <label class="permission-item" :class="{ active: subUserDialog.permissions.canAccessInstanceSettings }">
            <a-checkbox v-model:checked="subUserDialog.permissions.canAccessInstanceSettings" />
            <span>Instance Settings</span>
          </label>
        </div>
      </div>

      <!-- Security Restrictions -->
      <div class="permission-section security-section">
        <div class="section-header">
          <SafetyOutlined />
          <span>Security Restrictions</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item restriction" :class="{ active: subUserDialog.permissions.disableRightClick }">
            <a-checkbox v-model:checked="subUserDialog.permissions.disableRightClick" />
            <span>Disable Right Click</span>
          </label>
          <label class="permission-item restriction" :class="{ active: subUserDialog.permissions.disableKeyboardShortcuts }">
            <a-checkbox v-model:checked="subUserDialog.permissions.disableKeyboardShortcuts" />
            <span>Disable Shortcuts</span>
          </label>
          <label class="permission-item restriction" :class="{ active: subUserDialog.permissions.disableTextSelection }">
            <a-checkbox v-model:checked="subUserDialog.permissions.disableTextSelection" />
            <span>Disable Selection</span>
          </label>
          <label class="permission-item restriction" :class="{ active: subUserDialog.permissions.disableCopy }">
            <a-checkbox v-model:checked="subUserDialog.permissions.disableCopy" />
            <span>Disable Copy</span>
          </label>
          <label class="permission-item restriction" :class="{ active: subUserDialog.permissions.disablePaste }">
            <a-checkbox v-model:checked="subUserDialog.permissions.disablePaste" />
            <span>Disable Paste</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="subUserDialog.visible = false">Cancel</button>
        <button class="btn-save" :disabled="subUserDialog.loading" @click="saveSubUserPermissions">
          {{ subUserDialog.loading ? 'Saving...' : 'Save Permissions' }}
        </button>
      </div>
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
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.user-card {
  background: var(--background-color-white);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 16px var(--card-shadow-color);
  transition: all 0.3s ease;
  position: relative;
  border: 2px solid var(--card-border-color);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(255, 140, 66, 0.25);
    border-color: rgba(255, 140, 66, 0.5);
  }

  &.selected {
    border-color: #FF8C42;
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.08), rgba(212, 175, 55, 0.08));
  }
}

.card-checkbox {
  position: absolute;
  top: 20px;
  left: 20px;
  cursor: pointer;
  z-index: 1;
}

.checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid var(--card-border-color);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: var(--background-color);

  &.checked {
    background: linear-gradient(135deg, #FF8C42, #FF6B35);
    border-color: #FF8C42;
    color: white;
  }

  &:hover {
    border-color: #FF8C42;
  }
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: white;
  margin: 0 auto 20px;
  border: 4px solid;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);
}

.user-info {
  text-align: center;
  margin-bottom: 20px;
}

.user-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0 0 12px 0;
}

.user-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.user-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--card-bottom-background-color);
  border-radius: 12px;
  border: 1px solid var(--card-border-color);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 20px;
  color: #FF8C42;
}

.stat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--color-gray-7);
  font-weight: 600;
}

.stat-value {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.user-uuid {
  padding: 12px;
  background: var(--background-color);
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 12px;
  word-break: break-all;
  border: 1px solid var(--card-border-color);
}

.uuid-label {
  color: var(--color-gray-7);
  font-weight: 600;
  margin-right: 8px;
}

.uuid-value {
  color: var(--text-color);
  font-family: monospace;
}

// Action Menu
.action-menu-container {
  position: relative;
}

.action-menu-btn {
  width: 100%;
  padding: 12px;
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
  .users-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
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

  .users-grid {
    grid-template-columns: 1fr;
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
</style>
