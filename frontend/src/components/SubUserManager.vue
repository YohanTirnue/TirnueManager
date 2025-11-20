<script setup lang="ts">
import { ref, computed, watch, h } from "vue";
import { t } from "@/lang/i18n";
import { message, Modal, type FormInstance } from "ant-design-vue";
import {
  UserOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  TeamOutlined
} from "@ant-design/icons-vue";
import type { Rule } from "ant-design-vue/es/form";
import { PASSWORD_REGEX } from "@/tools/validator";
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
  disableRightClick: false,
  disableKeyboardShortcuts: false,
  disableTextSelection: false,
  disableCopy: false,
  disablePaste: false
};

const formData = ref({
  uuid: "",
  userName: "",
  passWord: "",
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
  userName: [
    { required: true, message: t("TXT_CODE_2695488c") },
    { min: 3, max: 20, message: t("TXT_CODE_3f477ec"), trigger: "blur" }
  ],
  passWord: [
    {
      required: true,
      min: 9,
      max: 36,
      validator: async (_rule: Rule, value: string) => {
        if (!value && !isEditMode.value) throw new Error("Password is required");
        if (value && !PASSWORD_REGEX.test(value)) throw new Error(t("TXT_CODE_6032f5a3"));
      },
      trigger: "blur"
    }
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
    userName: "",
    passWord: "",
    permissions: _.cloneDeep(defaultPermissions),
    parentUuid: ""
  };
  dialogVisible.value = true;
};

const handleEditSubUser = (subUser: SubUser) => {
  isEditMode.value = true;
  formData.value = {
    uuid: subUser.uuid,
    userName: subUser.userName,
    passWord: "",
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
      // Create new sub-user
      const createData: any = {
        userName: formData.value.userName,
        passWord: formData.value.passWord,
        permissions: formData.value.permissions
      };

      // If admin, include parentUuid
      if (isAdmin.value && formData.value.parentUuid) {
        createData.parentUuid = formData.value.parentUuid;
      }

      await createSubUser().execute({
        params: {
          daemonId: props.daemonId,
          instanceUuid: props.instanceUuid
        },
        data: createData
      });
      message.success(t("TXT_CODE_c7c04c00"));
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
    :title="
      isAdmin
        ? `Manage Sub-Users (${subUsers.length} total)`
        : `Manage Sub-Users (${subUsers.length}/${MAX_SUB_USERS})`
    "
    :width="800"
    @cancel="handleClose"
  >
    <template #footer>
      <a-button @click="handleClose">{{ t("TXT_CODE_d507abff") }}</a-button>
    </template>

    <div class="sub-user-manager">
      <a-alert
        v-if="!canAddMore && !isAdmin"
        type="warning"
        :message="`Maximum ${MAX_SUB_USERS} sub-users reached for this instance`"
        show-icon
        style="margin-bottom: 16px"
      />
      <a-alert
        v-if="!canAddMore && isAdmin"
        type="info"
        :message="`All parent users have reached the maximum of ${MAX_SUB_USERS} sub-users for this instance`"
        show-icon
        style="margin-bottom: 16px"
      />

      <a-button
        type="primary"
        :icon="h(PlusOutlined)"
        :disabled="!canAddMore"
        @click="handleAddSubUser"
        style="margin-bottom: 16px"
      >
        Add Sub-User
      </a-button>

      <a-spin :spinning="loading">
        <a-list
          v-if="subUsers.length > 0"
          :data-source="subUsers"
          item-layout="horizontal"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <a-button
                  type="text"
                  :icon="h(EditOutlined)"
                  @click="handleEditSubUser(item)"
                >
                  Edit Permissions
                </a-button>
                <a-button
                  type="text"
                  danger
                  :icon="h(DeleteOutlined)"
                  @click="handleDeleteSubUser(item)"
                >
                  Delete
                </a-button>
              </template>
              <a-list-item-meta>
                <template #avatar>
                  <a-avatar :style="{ backgroundColor: '#1890ff' }">
                    <template #icon>
                      <UserOutlined />
                    </template>
                  </a-avatar>
                </template>
                <template #title>
                  {{ item.userName }}
                  <a-tag v-if="isAdmin && item.parentUserId" color="blue" style="margin-left: 8px">
                    Parent: {{ parentUserMap.get(item.parentUserId) || "Unknown" }}
                  </a-tag>
                </template>
                <template #description>
                  <div>Created: {{ item.registerTime }}</div>
                  <div v-if="item.loginTime">Last Login: {{ item.loginTime }}</div>
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
        <a-empty v-else description="No sub-users created yet" />
      </a-spin>
    </div>

    <!-- Sub-User Form Dialog -->
    <a-modal
      v-model:open="dialogVisible"
      :title="isEditMode ? 'Edit Sub-User Permissions' : 'Create Sub-User'"
      :width="600"
      @ok="handleSubmit"
      @cancel="dialogVisible = false"
    >
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical"
      >
        <a-form-item
          v-if="!isEditMode && isAdmin"
          name="parentUuid"
          label="Parent User"
        >
          <a-select
            v-model:value="formData.parentUuid"
            placeholder="Select parent user with available slots"
            style="width: 100%"
          >
            <a-select-option
              v-for="parent in availableParents"
              :key="parent.uuid"
              :value="parent.uuid"
            >
              {{ parent.userName }}
            </a-select-option>
          </a-select>
          <div v-if="availableParents.length === 0" style="color: #ff4d4f; margin-top: 8px">
            All parent users have reached the maximum of {{ MAX_SUB_USERS }} sub-users
          </div>
        </a-form-item>

        <a-form-item v-if="!isEditMode" name="userName" label="Username">
          <a-input v-model:value="formData.userName" placeholder="Enter username" />
        </a-form-item>

        <a-form-item v-if="!isEditMode" name="passWord" label="Password">
          <a-input-password
            v-model:value="formData.passWord"
            placeholder="Min 9 chars, include uppercase, lowercase, and numbers"
          />
        </a-form-item>

        <a-divider>Permissions</a-divider>

        <div class="permissions-grid">
          <div class="permission-section">
            <h4>Instance Control</h4>
            <a-checkbox v-model:checked="formData.permissions.canStartInstances">
              Start Instances
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canRestartInstances">
              Restart Instances
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canStopInstances">
              Stop Instances
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canTerminateInstances">
              Terminate Instances
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canAccessConsole">
              Access Console
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canViewLogs">
              View Logs
            </a-checkbox>
          </div>

          <div class="permission-section">
            <h4>File Operations</h4>
            <a-checkbox v-model:checked="formData.permissions.canUploadFiles">
              Upload Files
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canDownloadFiles">
              Download Files
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canModifyFiles">
              Modify Files
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canDeleteFiles">
              Delete Files
            </a-checkbox>
            <a-checkbox v-model:checked="formData.permissions.canAccessFileManager">
              Access File Manager
            </a-checkbox>
          </div>
        </div>
      </a-form>
    </a-modal>
  </a-modal>
</template>

<style scoped>
.sub-user-manager {
  min-height: 300px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.permission-section h4 {
  margin-bottom: 12px;
  font-weight: 600;
}

.permission-section .a-checkbox-wrapper {
  display: block;
  margin-bottom: 8px;
}
</style>
