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
  ClockCircleOutlined
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
const dataSource = computed(() => data?.value?.data || []);
const selectedUsers = ref<string[]>([]);
const currentRole = ref("");
const showActionMenu = ref<string | null>(null);

const handleToUserResources = (user: BaseUserInfo) => {
  toPage({
    path: "/users/resources",
    query: {
      uuid: user.uuid
    }
  });
  showActionMenu.value = null;
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
  showActionMenu.value = null;
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
              canViewLogs: true,
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
    canViewLogs: true,
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
  showActionMenu.value = null;
};

const search = throttle(async () => {
  operationForm.value.currentPage = 1;
  await fetchData();
}, 600);

const toggleActionMenu = (uuid: string) => {
  showActionMenu.value = showActionMenu.value === uuid ? null : uuid;
};

const getPermissionIcon = (permission: string) => {
  if (permission === "10") return CrownOutlined;
  if (permission === "1") return UserOutlined;
  return TeamOutlined;
};

const getPermissionColor = (permission: string) => {
  if (permission === "10") return "#FF8C42";
  if (permission === "1") return "#52c41a";
  return "#1890ff";
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
    :title="userDialog.title"
    :confirm-loading="userDialog.confirmBtnLoading"
    @ok="userDialog.resolve()"
  >
    <a-form
      ref="formRef"
      :rules="isAddMode ? addUserRules : editUserRules"
      :model="formData"
      layout="vertical"
    >
      <a-form-item required name="permission" :label="t('TXT_CODE_511aea70')">
        <a-typography-paragraph>
          <a-typography-text type="secondary">
            {{ t("TXT_CODE_21b8b71a") }}
          </a-typography-text>
        </a-typography-paragraph>
        <a-select v-model:value="formData.permission">
          <a-select-option v-for="(item, key, i) in PERMISSION_MAP" :key="i" :value="Number(key)">
            {{ item }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item required name="userName" :label="t('TXT_CODE_eb9fcdad')">
        <a-typography-paragraph>
          <a-typography-text type="secondary">
            {{ t("TXT_CODE_1987587b") }}
          </a-typography-text>
        </a-typography-paragraph>
        <a-input v-model:value="formData.userName" :placeholder="t('TXT_CODE_4ea93630')" />
      </a-form-item>

      <a-form-item :required="isAddMode" name="passWord" :label="t('TXT_CODE_551b0348')">
        <a-typography-paragraph>
          <a-typography-text type="secondary">
            {{ !isAddMode ? t("TXT_CODE_af1f921d") : t("TXT_CODE_1f2062c7") }}
          </a-typography-text>
        </a-typography-paragraph>
        <a-input v-model:value="formData.passWord" :placeholder="t('TXT_CODE_4ea93630')" />
      </a-form-item>

      <a-form-item v-if="!isAddMode" label="APIKEY">
        <a-typography-paragraph v-if="!formData.apiKey">
          {{ t("TXT_CODE_6c274bdc") }}
        </a-typography-paragraph>
        <a-input v-else v-model:value="formData.apiKey" :readonly="true" />
      </a-form-item>

      <!-- Granular Permissions Section -->
      <a-form-item label="User Permissions" class="permissions-section">
        <a-typography-paragraph>
          <a-typography-text type="secondary">
            Configure specific permissions for this user
          </a-typography-text>
        </a-typography-paragraph>

        <div class="permissions-grid">
          <!-- File Operations -->
          <div class="permission-category">
            <h4 class="category-title">
              <DatabaseOutlined class="category-icon" />
              File Operations
            </h4>
            <div class="permission-items">
              <a-checkbox v-model:checked="formData.permissions!.canUploadFiles">
                Upload Files
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canDownloadFiles">
                Download Files
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canDeleteFiles">
                Delete Files
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canModifyFiles">
                Modify Files
              </a-checkbox>
            </div>
          </div>

          <!-- Instance Control -->
          <div class="permission-category">
            <h4 class="category-title">
              <DatabaseOutlined class="category-icon" />
              Instance Control
            </h4>
            <div class="permission-items">
              <a-checkbox v-model:checked="formData.permissions!.canAccessConsole">
                Access Console
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canStartInstances">
                Start Instances
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canRestartInstances">
                Restart Instances
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canStopInstances">
                Stop Instances
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.canViewLogs">
                View Logs
              </a-checkbox>
            </div>
          </div>

          <!-- Copy & Interaction Restrictions -->
          <div class="permission-category">
            <h4 class="category-title">
              <SafetyOutlined class="category-icon" />
              Security Restrictions
            </h4>
            <div class="permission-items">
              <a-checkbox v-model:checked="formData.permissions!.disableRightClick">
                Disable Right Click
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.disableKeyboardShortcuts">
                Disable Keyboard Shortcuts
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.disableTextSelection">
                Prevent Text Selection
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.disableCopy">
                Disable Copy
              </a-checkbox>
              <a-checkbox v-model:checked="formData.permissions!.disablePaste">
                Disable Paste
              </a-checkbox>
            </div>
          </div>
        </div>
      </a-form-item>

      <a-form-item v-if="isAddMode" required :label="t('TXT_CODE_ef0ce2e')">
        <a-typography-paragraph>
          <a-typography-text type="secondary">
            {{ t("TXT_CODE_9e9d3767") }}
            <br />
            <a href="https://docs.mcsmanager.com/" target="_blank">
              {{ t("TXT_CODE_b01f8383") }}
            </a>
          </a-typography-text>
        </a-typography-paragraph>
      </a-form-item>
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

          <!-- UUID -->
          <div class="user-uuid">
            <span class="uuid-label">UUID:</span>
            <span class="uuid-value">{{ user.uuid }}</span>
          </div>

          <!-- Action Button -->
          <div class="action-menu-container">
            <button class="action-menu-btn" @click.stop="toggleActionMenu(user.uuid)">
              <MoreOutlined />
            </button>

            <!-- Action Dropdown -->
            <div v-if="showActionMenu === user.uuid" class="action-dropdown">
              <button class="dropdown-item edit-item" @click="handleEditUser(user)">
                <EditOutlined />
                {{ t("TXT_CODE_236f70aa") || "Edit" }}
              </button>
              <button class="dropdown-item resources-item" @click="handleToUserResources(user)">
                <DatabaseOutlined />
                {{ t("TXT_CODE_4d934e3a") || "Resources" }}
              </button>
              <button class="dropdown-item delete-item" @click="showDeleteConfirm(user)">
                <DeleteOutlined />
                {{ t("TXT_CODE_ecbd7449") || "Delete" }}
              </button>
            </div>
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

  <!-- Click outside to close dropdown -->
  <div v-if="showActionMenu" class="dropdown-overlay" @click="showActionMenu = null"></div>
</template>

<style lang="scss" scoped>
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

.action-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: var(--background-color-white);
  border: 2px solid var(--card-border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px var(--card-shadow-extend-color);
  overflow: hidden;
  z-index: 100;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-item {
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: var(--text-color);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    background: rgba(255, 140, 66, 0.08);
  }

  &.edit-item:hover {
    background: rgba(24, 144, 255, 0.12);
    color: var(--color-blue-6);
  }

  &.resources-item:hover {
    background: rgba(82, 196, 26, 0.12);
    color: var(--color-green-6);
  }

  &.delete-item {
    color: var(--color-red-5);

    &:hover {
      background: rgba(255, 77, 79, 0.12);
      color: var(--color-red-6);
    }
  }
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.permission-category {
  background: var(--card-bottom-background-color);
  border: 2px solid var(--card-border-color);
  border-radius: 12px;
  padding: 16px;
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
  margin: 0 0 12px 0;
  padding-bottom: 12px;
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
  gap: 10px;

  :deep(.ant-checkbox-wrapper) {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-color);
    padding: 8px 12px;
    border-radius: 8px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 140, 66, 0.08);
      padding-left: 16px;
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

// Make modal wider to accommodate permissions
:deep(.ant-modal) {
  max-width: 900px;
}
</style>
