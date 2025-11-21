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
  editUserInfo
} from "@/services/apis";
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
      class="unified-modal-form"
    >
      <!-- Account Information Section -->
      <div class="modal-section">
        <div class="section-header">
          <IdcardOutlined class="section-icon" />
          <div>
            <h4>Account Information</h4>
            <span>Basic user credentials and role</span>
          </div>
        </div>
        <div class="form-row">
          <a-form-item required name="permission">
            <template #label><span class="field-label">{{ t("TXT_CODE_511aea70") }}</span></template>
            <a-select v-model:value="formData.permission" size="large">
              <a-select-option v-for="(item, key, i) in PERMISSION_MAP" :key="i" :value="Number(key)">
                {{ item }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item required name="userName">
            <template #label>
              <span class="field-label">{{ t("TXT_CODE_eb9fcdad") }}</span>
              <span class="field-hint">{{ t("TXT_CODE_1987587b") }}</span>
            </template>
            <a-input v-model:value="formData.userName" :placeholder="t('TXT_CODE_4ea93630')" size="large" />
          </a-form-item>
          <a-form-item :required="isAddMode" name="passWord">
            <template #label>
              <span class="field-label">{{ t("TXT_CODE_551b0348") }}</span>
              <span class="field-hint">{{ !isAddMode ? t("TXT_CODE_af1f921d") : t("TXT_CODE_1f2062c7") }}</span>
            </template>
            <a-input-password v-model:value="formData.passWord" :placeholder="t('TXT_CODE_4ea93630')" size="large" />
          </a-form-item>
          <a-form-item v-if="!isAddMode" class="grow">
            <template #label>
              <span class="field-label">APIKEY</span>
              <span class="field-hint">API authentication key</span>
            </template>
            <a-input v-if="formData.apiKey" v-model:value="formData.apiKey" :readonly="true" size="large" />
            <span v-else class="empty-value">{{ t("TXT_CODE_6c274bdc") }}</span>
          </a-form-item>
        </div>
      </div>

      <!-- Permissions Section -->
      <div class="modal-section">
        <div class="section-header">
          <SafetyOutlined class="section-icon" />
          <div>
            <h4>Access Control & Security</h4>
            <span>Configure specific permissions for this user</span>
          </div>
        </div>
        <div class="permissions-grid">
          <div class="perm-category">
            <div class="perm-category-header">
              <DatabaseOutlined />
              <span>File Operations</span>
            </div>
            <div class="perm-items">
              <label :class="{ active: formData.permissions!.canUploadFiles }">
                <a-checkbox v-model:checked="formData.permissions!.canUploadFiles" />Upload
              </label>
              <label :class="{ active: formData.permissions!.canDownloadFiles }">
                <a-checkbox v-model:checked="formData.permissions!.canDownloadFiles" />Download
              </label>
              <label :class="{ active: formData.permissions!.canDeleteFiles }">
                <a-checkbox v-model:checked="formData.permissions!.canDeleteFiles" />Delete
              </label>
              <label :class="{ active: formData.permissions!.canModifyFiles }">
                <a-checkbox v-model:checked="formData.permissions!.canModifyFiles" />Modify
              </label>
            </div>
          </div>
          <div class="perm-category">
            <div class="perm-category-header">
              <ControlOutlined />
              <span>Instance Control</span>
            </div>
            <div class="perm-items">
              <label :class="{ active: formData.permissions!.canAccessConsole }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessConsole" />Console
              </label>
              <label :class="{ active: formData.permissions!.canStartInstances }">
                <a-checkbox v-model:checked="formData.permissions!.canStartInstances" />Start
              </label>
              <label :class="{ active: formData.permissions!.canRestartInstances }">
                <a-checkbox v-model:checked="formData.permissions!.canRestartInstances" />Restart
              </label>
              <label :class="{ active: formData.permissions!.canStopInstances }">
                <a-checkbox v-model:checked="formData.permissions!.canStopInstances" />Stop
              </label>
              <label :class="{ active: formData.permissions!.canViewLogs }">
                <a-checkbox v-model:checked="formData.permissions!.canViewLogs" />Logs
              </label>
            </div>
          </div>
          <div class="perm-category">
            <div class="perm-category-header">
              <SettingOutlined />
              <span>Management</span>
            </div>
            <div class="perm-items">
              <label :class="{ active: formData.permissions!.canAccessConfigFiles }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessConfigFiles" />Config
              </label>
              <label :class="{ active: formData.permissions!.canAccessFileManager }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessFileManager" />Files
              </label>
              <label :class="{ active: formData.permissions!.canAccessTerminalSettings }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessTerminalSettings" />Terminal
              </label>
              <label :class="{ active: formData.permissions!.canAccessScheduledTasks }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessScheduledTasks" />Schedule
              </label>
              <label :class="{ active: formData.permissions!.canAccessEventTasks }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessEventTasks" />Events
              </label>
              <label :class="{ active: formData.permissions!.canAccessInstanceSettings }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessInstanceSettings" />Settings
              </label>
              <label :class="{ active: formData.permissions!.canAccessMinecraftQuery }">
                <a-checkbox v-model:checked="formData.permissions!.canAccessMinecraftQuery" />MC Query
              </label>
            </div>
          </div>
          <div class="perm-category warning">
            <div class="perm-category-header">
              <SafetyOutlined />
              <span>Restrictions</span>
            </div>
            <div class="perm-items">
              <label :class="{ active: formData.permissions!.disableRightClick }">
                <a-checkbox v-model:checked="formData.permissions!.disableRightClick" />No Right-Click
              </label>
              <label :class="{ active: formData.permissions!.disableKeyboardShortcuts }">
                <a-checkbox v-model:checked="formData.permissions!.disableKeyboardShortcuts" />No Shortcuts
              </label>
              <label :class="{ active: formData.permissions!.disableTextSelection }">
                <a-checkbox v-model:checked="formData.permissions!.disableTextSelection" />No Selection
              </label>
              <label :class="{ active: formData.permissions!.disableCopy }">
                <a-checkbox v-model:checked="formData.permissions!.disableCopy" />No Copy
              </label>
              <label :class="{ active: formData.permissions!.disablePaste }">
                <a-checkbox v-model:checked="formData.permissions!.disablePaste" />No Paste
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Sub-Users Section -->
      <div v-if="!isAddMode && formData.subUsers && formData.subUsers.length > 0" class="modal-section">
        <div class="section-header">
          <TeamOutlined class="section-icon" />
          <div>
            <h4>Sub-Users ({{ formData.subUsers.length }})</h4>
            <span>Sub-users created by this parent user</span>
          </div>
        </div>
        <div class="sub-users-list">
          <div v-for="item in formData.subUsers" :key="item.uuid" class="sub-user-item">
            <UserOutlined />
            <span>{{ getUserNameById(item.uuid) || 'Unknown' }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button type="button" class="btn-cancel" @click="userDialog.status = false">Cancel</button>
        <button type="button" class="btn-submit" :disabled="userDialog.confirmBtnLoading" @click="userDialog.resolve()">
          {{ userDialog.confirmBtnLoading ? 'Saving...' : (isAddMode ? 'Create User' : 'Save Changes') }}
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
</template>


<style lang="scss" scoped>
/* Unified Modal Form */
.unified-modal-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.modal-section {
  border-bottom: 1px solid var(--color-border-2);

  &:last-of-type {
    border-bottom: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: var(--color-bg-3);

  .section-icon {
    font-size: 20px;
    color: #ff8c00;
  }

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-1);
  }

  span {
    display: block;
    font-size: 12px;
    color: var(--color-text-3);
  }
}

/* Form Row - Account Info */
.form-row {
  display: grid;
  grid-template-columns: 120px 180px 180px 1fr;
  gap: 16px;
  padding: 16px 24px;
  align-items: start;

  .ant-form-item {
    margin: 0;
  }

  .grow {
    grid-column: span 1;
  }
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-1);
}

.field-hint {
  display: block;
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 2px;
}

.empty-value {
  color: var(--color-text-3);
  font-style: italic;
  font-size: 13px;
}

/* Permissions Grid */
.permissions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px 24px;
}

.perm-category {
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  padding: 12px;

  &.warning {
    border-color: rgba(250, 173, 20, 0.4);
    background: rgba(250, 173, 20, 0.05);
  }
}

.perm-category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-1);

  .anticon {
    color: #ff8c00;
  }
}

.perm-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--color-bg-2);
    border: 1px solid var(--color-border-2);
    border-radius: 4px;
    font-size: 12px;
    color: var(--color-text-2);
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      border-color: #ff8c00;
    }

    &.active {
      border-color: #ff8c00;
      background: rgba(255, 140, 0, 0.1);
      color: #ff8c00;
    }
  }
}

/* Sub-Users */
.sub-users-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px;
}

.sub-user-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-bg-3);
  border-radius: 6px;
  font-size: 12px;
  color: var(--color-text-2);
}

/* Modal Footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--color-bg-3);
  border-top: 1px solid var(--color-border-2);
}

.btn-cancel, .btn-submit {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);

  &:hover {
    border-color: var(--color-text-3);
  }
}

.btn-submit {
  background: linear-gradient(135deg, #ff8c00, #ff6b00);
  border: none;
  color: white;

  &:hover {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* Modal Header */
.modal-header-industrial {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-industrial {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8c00, #ff6b00);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
}

.header-content-industrial h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1);
}

.header-subtitle-industrial {
  font-size: 12px;
  color: var(--color-text-3);
}

/* Users Page */
.modern-users-page {
  padding: 24px;
  min-height: 100vh;
  background: var(--background-color);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-icon {
  font-size: 24px;
  color: #ff8c00;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-1);
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-3);
}

.header-right {
  display: flex;
  gap: 12px;
}

.search-section {
  display: flex;
  gap: 12px;
  align-items: center;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #ff8c00, #ff6b00);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(1.1);
  }
}

/* User Stats */
.user-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
}

.stat-icon {
  font-size: 20px;
  color: #ff8c00;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-text-1);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-3);
}

/* Users Grid */
.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.user-card {
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;

  &:hover {
    border-color: #ff8c00;
    box-shadow: 0 4px 12px rgba(255, 140, 0, 0.1);
  }
}

.card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8c00, #ff6b00);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

.user-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: rgba(255, 140, 0, 0.1);
  color: #ff8c00;
}

.user-uuid {
  margin-bottom: 12px;
}

.uuid-label {
  font-size: 11px;
  color: var(--color-text-3);
}

.uuid-value {
  font-size: 12px;
  color: var(--color-text-2);
  font-family: monospace;
}

.action-menu-container {
  display: flex;
  gap: 8px;
}

.action-menu-btn, .edit-btn, .delete-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-btn {
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);

  &:hover {
    border-color: #ff8c00;
    color: #ff8c00;
  }
}

.delete-btn {
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  color: #ff4d4f;

  &:hover {
    background: rgba(255, 77, 79, 0.2);
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

/* Action Modal */
.action-modal-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-modal-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 6px;
  color: var(--color-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #ff8c00;
    color: #ff8c00;
  }
}

.action-icon {
  font-size: 14px;
}

/* Responsive */
@media (max-width: 1200px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }

  .permissions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .permissions-grid {
    grid-template-columns: 1fr;
  }

  .user-stats {
    flex-direction: column;
  }
}
</style>
