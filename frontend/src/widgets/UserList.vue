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
              canTerminateInstances: true,
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
    canTerminateInstances: true,
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
    :width="1400"
    @ok="userDialog.resolve()"
  >
    <a-form
      ref="formRef"
      :rules="isAddMode ? addUserRules : editUserRules"
      :model="formData"
      layout="vertical"
    >
      <!-- Basic Information + APIKEY - FULLY LANDSCAPE -->
      <div class="user-settings-card">
        <div class="user-settings-row-horizontal">
          <!-- Permission -->
          <a-form-item required name="permission" class="user-form-item-horizontal">
            <div class="user-control-label">
              <span class="user-label-text required">{{ t("TXT_CODE_511aea70") }}</span>
            </div>
            <a-select v-model:value="formData.permission" style="width: 180px">
              <a-select-option v-for="(item, key, i) in PERMISSION_MAP" :key="i" :value="Number(key)">
                {{ item }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <!-- Username -->
          <a-form-item required name="userName" class="user-form-item-horizontal">
            <div class="user-control-label">
              <span class="user-label-text required">{{ t("TXT_CODE_eb9fcdad") }}</span>
              <span class="user-label-hint">{{ t("TXT_CODE_1987587b") }}</span>
            </div>
            <a-input
              v-model:value="formData.userName"
              :placeholder="t('TXT_CODE_4ea93630')"
              style="width: 220px"
            />
          </a-form-item>

          <!-- Password -->
          <a-form-item :required="isAddMode" name="passWord" class="user-form-item-horizontal">
            <div class="user-control-label">
              <span class="user-label-text" :class="{ required: isAddMode }">{{ t("TXT_CODE_551b0348") }}</span>
              <span class="user-label-hint">{{ !isAddMode ? t("TXT_CODE_af1f921d") : t("TXT_CODE_1f2062c7") }}</span>
            </div>
            <a-input
              v-model:value="formData.passWord"
              :placeholder="t('TXT_CODE_4ea93630')"
              style="width: 220px"
              type="password"
            />
          </a-form-item>

          <!-- APIKEY (Edit Mode Only) -->
          <a-form-item v-if="!isAddMode" class="user-form-item-horizontal user-form-item-grow">
            <div class="user-control-label">
              <span class="user-label-text">APIKEY</span>
              <span class="user-label-hint">API authentication key</span>
            </div>
            <a-input
              v-if="formData.apiKey"
              v-model:value="formData.apiKey"
              :readonly="true"
              style="width: 100%"
            />
            <span v-else class="user-apikey-empty">{{ t("TXT_CODE_6c274bdc") }}</span>
          </a-form-item>
        </div>
      </div>

      <!-- User Permissions Card - FULLY HORIZONTAL 4-COLUMN GRID -->
      <div class="user-settings-card">
        <div class="permissions-header">
          <h4 class="permissions-main-title">User Permissions</h4>
          <p class="permissions-main-subtitle">Configure specific permissions for this user</p>
        </div>
        <div class="permissions-landscape-grid-4col">
            <!-- File Operations -->
            <div class="permission-category-landscape">
              <h4 class="category-title-landscape">
                <DatabaseOutlined class="category-icon-landscape" />
                File Operations
              </h4>
              <div class="permission-items-landscape">
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
            <div class="permission-category-landscape">
              <h4 class="category-title-landscape">
                <DatabaseOutlined class="category-icon-landscape" />
                Instance Control
              </h4>
              <div class="permission-items-landscape">
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
                <a-checkbox v-model:checked="formData.permissions!.canTerminateInstances">
                  Terminate Instances
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canViewLogs">
                  View Logs
                </a-checkbox>
              </div>
            </div>

            <!-- Instance Management Access -->
            <div class="permission-category-landscape">
              <h4 class="category-title-landscape">
                <ControlOutlined class="category-icon-landscape" />
                Instance Management Access
              </h4>
              <div class="permission-items-landscape">
                <a-checkbox v-model:checked="formData.permissions!.canAccessConfigFiles">
                  Configuration Files
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canAccessFileManager">
                  File Management
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canAccessMinecraftQuery">
                  Minecraft Players Query
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canAccessTerminalSettings">
                  Terminal Settings
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canAccessScheduledTasks">
                  Scheduled Tasks
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canAccessEventTasks">
                  Event Tasks
                </a-checkbox>
                <a-checkbox v-model:checked="formData.permissions!.canAccessInstanceSettings">
                  Instance Settings
                </a-checkbox>
              </div>
            </div>

            <!-- Security Restrictions -->
            <div class="permission-category-landscape">
              <h4 class="category-title-landscape">
                <SafetyOutlined class="category-icon-landscape" />
                Security Restrictions
              </h4>
              <div class="permission-items-landscape">
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
    border-color: rgba(24, 144, 255, 0.3);
    color: var(--color-blue-6);

    &:hover {
      background: rgba(24, 144, 255, 0.12);
      border-color: var(--color-blue-6);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
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
  padding: 16px; /* OCD: 16px all around */
  margin-bottom: 16px; /* OCD: 16px between cards */
}

.user-info-row {
  display: flex;
  align-items: center;
  gap: 16px; /* OCD: 16px gap */
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
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  border: 2px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px; /* OCD: 24px all around */
  margin-bottom: 16px; /* OCD: 16px between cards */
  transition: all 0.3s ease;

  &:hover {
    border-color: #ff8c00; /* ORANGE on hover */
    box-shadow: 0 4px 16px rgba(255, 140, 0, 0.15);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.user-settings-row {
  display: flex;
  align-items: center; /* OCD: Vertically centered */
  gap: 32px; /* OCD: 32px between sections */
  justify-content: space-between;
}

.user-settings-column {
  flex-direction: column;
  align-items: flex-start;
  gap: 16px; /* OCD: 16px for vertical */
}

.user-settings-title-section {
  flex: 0 0 240px; /* OCD: Fixed 240px width */
  min-width: 240px;
}

.user-settings-title {
  margin: 0 0 4px 0; /* OCD: 4px gap */
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffd700; /* GOLD */
  line-height: 1.4;
}

.user-settings-subtitle {
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: #999999;
  line-height: 1.4;
}

.user-settings-controls {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 24px; /* OCD: 24px between controls */
  align-items: flex-start;
}

.user-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px; /* OCD: 8px between label and input */
  margin-bottom: 0 !important;
}

.user-form-item-full {
  width: 100%;
  margin-bottom: 0 !important;
}

.user-control-label {
  display: flex;
  flex-direction: column;
  gap: 4px; /* OCD: 4px between text and hint */
}

.user-label-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.2;

  &.required::after {
    content: " *";
    color: #ff8c00; /* ORANGE asterisk */
  }
}

.user-label-hint {
  font-size: 12px;
  color: #666666;
  line-height: 1.2;
}

.user-apikey-empty {
  margin: 0;
  color: #999999;
  font-style: italic;
}

/* Permissions Grid - Three columns landscape */
/* FULLY HORIZONTAL LAYOUT */
.user-settings-row-horizontal {
  display: flex;
  align-items: flex-start;
  gap: 16px; /* OCD: 16px between form items */
  padding: 20px; /* OCD: 20px padding */
  flex-wrap: nowrap;
}

.user-form-item-horizontal {
  display: flex;
  flex-direction: column;
  gap: 8px; /* OCD: 8px between label and input */
  margin-bottom: 0 !important;
  flex-shrink: 0;
}

.user-form-item-grow {
  flex: 1;
  min-width: 0;
}

/* Permissions Header */
.permissions-header {
  padding: 20px 20px 0 20px; /* OCD: 20px padding, 0 bottom */
  border-bottom: 1px solid #2a2a2a;
  margin-bottom: 16px; /* OCD: 16px gap */
}

.permissions-main-title {
  margin: 0 0 4px 0; /* OCD: 4px gap */
  padding: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffd700; /* GOLD */
  line-height: 1.4;
}

.permissions-main-subtitle {
  margin: 0 0 12px 0; /* OCD: 12px bottom margin */
  padding: 0;
  font-size: 13px;
  color: #999999;
  line-height: 1.4;
}

/* 4-Column Grid for Permissions */
.permissions-landscape-grid-4col {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px; /* OCD: 16px between columns */
  width: 100%;
  padding: 0 20px 20px 20px; /* OCD: 20px padding, 0 top */
}

.permission-category-landscape {
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  border: 1px solid #2a2a2a;
  border-radius: 8px; /* OCD: 8px radius */
  padding: 16px; /* OCD: 16px padding */
}

.category-title-landscape {
  display: flex;
  align-items: center;
  gap: 8px; /* OCD: 8px gap */
  margin: 0 0 12px 0; /* OCD: 12px bottom margin */
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffd700; /* GOLD */
  line-height: 1.2;
}

.category-icon-landscape {
  font-size: 16px;
  color: #ff8c00; /* ORANGE */
}

.permission-items-landscape {
  display: flex;
  flex-direction: column;
  gap: 8px; /* OCD: 8px between checkboxes */
}

/* RESPONSIVE: Stack vertically on mobile */
@media (max-width: 992px) {
  .user-settings-row:not(.user-settings-column) {
    flex-direction: column;
    align-items: stretch;
    gap: 16px; /* OCD: Tighter gap on mobile */
  }

  .user-settings-title-section {
    flex: none;
    min-width: 0;
  }

  .user-settings-controls {
    flex-direction: column;
    gap: 16px;
  }

  .user-form-item {
    width: 100%;
  }

  .user-form-item input,
  .user-form-item .ant-select {
    width: 100% !important;
  }

  .permissions-landscape-grid-4col {
    grid-template-columns: 1fr; /* Single column on mobile */
    gap: 12px; /* OCD: 12px gap on mobile */
  }

  .user-settings-row-horizontal {
    flex-wrap: wrap; /* Allow wrapping on mobile */
  }

  .user-form-item-horizontal {
    width: 100%;

    input,
    .ant-select {
      width: 100% !important;
    }
  }
}

/* Customize Ant Design for ORANGE GOLD BLACK theme */
:deep(.user-settings-card) {
  .ant-input:hover,
  .ant-input:focus {
    border-color: #ff8c00; /* ORANGE */
  }

  .ant-input:focus {
    box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
  }

  .ant-select:not(.ant-select-disabled):hover .ant-select-selector,
  .ant-select-focused:not(.ant-select-disabled).ant-select .ant-select-selector {
    border-color: #ff8c00; /* ORANGE */
  }

  .ant-select-focused:not(.ant-select-disabled).ant-select .ant-select-selector {
    box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
  }

  .ant-checkbox-wrapper:hover .ant-checkbox-inner {
    border-color: #ff8c00; /* ORANGE */
  }

  .ant-checkbox-checked .ant-checkbox-inner {
    background: linear-gradient(135deg, #ff8c00 0%, #ffa500 100%); /* ORANGE */
    border-color: #ff8c00;
  }
}
</style>
