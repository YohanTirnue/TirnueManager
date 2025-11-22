<script setup lang="ts">
import type { LayoutCard } from "@/types";
import type { UserInstance, UserPermissions } from "@/types/user";
import { computed, ref, onMounted } from "vue";
import { t } from "@/lang/i18n";
import { useScreen } from "@/hooks/useScreen";
import { arrayFilter } from "@/tools/array";
import { userInfoApiAdvanced } from "@/services/apis";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { updateUserInstance } from "@/services/apis";
import { useSelectInstances } from "@/components/fc";
import { message } from "ant-design-vue";
import { reportErrorMsg } from "@/tools/validator";
import { INSTANCE_STATUS } from "@/types/const";
import type { AntColumnsType, AntTableCell } from "@/types/ant";
import dayjs from "dayjs";
import WarningDialog from "@/components/fc/WarningDialog.vue";
import { useMountComponent } from "@/hooks/useMountComponent";
import _ from "lodash";
import {
  AppstoreOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined,
  SettingOutlined,
  SafetyOutlined,
  ControlOutlined,
  DatabaseOutlined
} from "@ant-design/icons-vue";

const props = defineProps<{
  card: LayoutCard;
  uuid: string;
}>();

const { isPhone } = useScreen();

const dataSource = ref<UserInstance[]>([]);
const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
const userUuid = getMetaOrRouteValue("uuid");

const handleDelete = async (deletedInstance: UserInstance) => {
  try {
    for (let valueKey = 0; valueKey < dataSource.value.length; valueKey++) {
      const instance = dataSource.value[valueKey];
      if (
        deletedInstance.daemonId == instance.daemonId &&
        deletedInstance.instanceUuid == instance.instanceUuid
      ) {
        dataSource.value.splice(valueKey, 1);
        break;
      }
    }
    await saveData();
  } catch (error: any) {
    reportErrorMsg(error);
  }
};

const assignApp = async () => {
  try {
    // Track existing instances before selection
    const previousInstances = dataSource.value.map(inst => ({
      daemonId: inst.daemonId,
      instanceUuid: inst.instanceUuid
    }));

    const selectedInstances = await useSelectInstances(dataSource.value);
    let warningInstances: string[] = [];
    for (const instance of selectedInstances || []) {
      // Warn if instance is not protected by Docker container
      if (
        instance.config?.processType !== "docker" ||
        !instance.config?.docker?.image
      ) {
        warningInstances.push(instance.nickname);
      }
    }
    if (warningInstances.length > 0) {
      const component = (
        await useMountComponent({
          title: t("TXT_CODE_dd78943e"),
          subTitle: t("TXT_CODE_57e86edb") + warningInstances.join(", "),
          checkText: t("TXT_CODE_19f697f3")
        })
      ).load<InstanceType<typeof WarningDialog>>(WarningDialog);
      await component.openDialog();
    }
    if (selectedInstances) {
      dataSource.value = selectedInstances;
      await saveData();

      // Find newly added instances (not in previous list)
      const newInstanceIndices: number[] = [];
      selectedInstances.forEach((inst, index) => {
        const wasExisting = previousInstances.some(
          prev => prev.daemonId === inst.daemonId && prev.instanceUuid === inst.instanceUuid
        );
        if (!wasExisting) {
          newInstanceIndices.push(index);
        }
      });

      // Queue new instances for permission setup
      if (newInstanceIndices.length > 0) {
        pendingPermissionSetup.value = newInstanceIndices;
        message.info(`Setting up permissions for ${newInstanceIndices.length} new instance(s)`);
        // Start processing the queue
        processNextPermissionSetup();
      }
    }
  } catch (err: any) {
    reportErrorMsg(err);
  }
};

const saveData = async () => {
  try {
    await updateUserInstance().execute({
      data: {
        config: {
          instances: dataSource.value
        },
        uuid: <string>userUuid
      }
    });
    message.success(t("TXT_CODE_d3de39b4"));
    refreshTableData().catch(() => {
      // ignore
    });
  } catch (err: any) {
    reportErrorMsg(err.message);
  }
};

async function refreshTableData() {
  if (userUuid == null) {
    return;
  }
  const rawUserInfo = (
    await userInfoApiAdvanced().execute({
      params: {
        uuid: <string>userUuid,
        advanced: true
      },
      forceRequest: true
    })
  ).value;
  if (!rawUserInfo) {
    return;
  }
  const newDataSource: UserInstance[] = [];
  for (const instance of rawUserInfo.instances) {
    newDataSource.push(instance);
  }
  dataSource.value = newDataSource;
}

onMounted(() => {
  refreshTableData();
});

// Default permissions for new instance assignments
const getDefaultPermissions = (): UserPermissions => ({
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
  canAccessServerMarket: true,
  disableRightClick: false,
  disableKeyboardShortcuts: false,
  disableTextSelection: false,
  disableCopy: false,
  disablePaste: false
});

// Permissions dialog state
const permissionsDialog = ref({
  visible: false,
  loading: false,
  instanceIndex: -1,
  instanceName: "",
  permissions: getDefaultPermissions()
});

// Queue for new instances needing permission setup
const pendingPermissionSetup = ref<number[]>([]);

const openPermissionsDialog = (record: UserInstance, index: number) => {
  permissionsDialog.value.instanceIndex = index;
  permissionsDialog.value.instanceName = record.nickname || "Instance";
  permissionsDialog.value.permissions = record.permissions
    ? _.cloneDeep(record.permissions)
    : getDefaultPermissions();
  permissionsDialog.value.visible = true;
};

// Process next instance in the permission setup queue
const processNextPermissionSetup = () => {
  if (pendingPermissionSetup.value.length > 0) {
    const nextIndex = pendingPermissionSetup.value.shift()!;
    if (nextIndex >= 0 && nextIndex < dataSource.value.length) {
      openPermissionsDialog(dataSource.value[nextIndex], nextIndex);
    } else {
      // Index no longer valid, try next
      processNextPermissionSetup();
    }
  }
};

const saveInstancePermissions = async () => {
  try {
    permissionsDialog.value.loading = true;
    const index = permissionsDialog.value.instanceIndex;
    if (index >= 0 && index < dataSource.value.length) {
      dataSource.value[index].permissions = _.cloneDeep(permissionsDialog.value.permissions);
      await saveData();
      permissionsDialog.value.visible = false;
      message.success("Instance permissions updated");

      // Process next in queue after a short delay
      setTimeout(() => {
        processNextPermissionSetup();
      }, 300);
    }
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    permissionsDialog.value.loading = false;
  }
};

// Handle dialog cancel - still process queue
const handlePermissionDialogCancel = () => {
  permissionsDialog.value.visible = false;
  // Process next in queue after a short delay
  setTimeout(() => {
    processNextPermissionSetup();
  }, 300);
};

const getPermissionCount = (instance: UserInstance): string => {
  if (!instance.permissions) return "Default (Full)";
  const perms = instance.permissions;
  const enabled = [
    perms.canUploadFiles, perms.canDownloadFiles, perms.canDeleteFiles, perms.canModifyFiles,
    perms.canAccessConsole, perms.canStartInstances, perms.canRestartInstances, perms.canStopInstances,
    perms.canTerminateInstances, perms.canViewLogs, perms.canAccessConfigFiles, perms.canAccessFileManager,
    perms.canAccessMinecraftQuery, perms.canAccessTerminalSettings, perms.canAccessScheduledTasks,
    perms.canAccessEventTasks, perms.canAccessInstanceSettings, perms.canAccessServerMarket
  ].filter(Boolean).length;
  return `${enabled}/18 enabled`;
};

const columns = computed(() => {
  return arrayFilter<AntColumnsType>([
    {
      align: "center",
      title: t("TXT_CODE_b26a0528"),
      dataIndex: "remarks",
      key: "remarks",
      minWidth: 200,
      condition: () => !isPhone.value,
      customRender: (row) => {
        return row.record.remarks || 'Daemon';
      }
    },
    {
      align: "center",
      title: t("TXT_CODE_f70badb9"),
      dataIndex: "nickname",
      key: "name",
      minWidth: 200
    },
    {
      align: "center",
      title: t("TXT_CODE_fa920c0"),
      dataIndex: "endTime",
      key: "endTime",
      minWidth: 200,
      condition: () => !isPhone.value,
      customRender: (row: { text: string | number }) => {
        if (Number(row.text) === 0) return t("TXT_CODE_8dfd8b17");
        if (!isNaN(Number(row.text))) return dayjs(Number(row.text)).format("YYYY-MM-DD HH:mm:ss");
        return row.text;
      }
    },
    {
      align: "center",
      title: t("TXT_CODE_3d602459"),
      dataIndex: "status",
      key: "status",
      minWidth: 200,
      customRender: (e: { text: "-1" | "1" | "2" | "3" }) => {
        return INSTANCE_STATUS[e.text] || e.text;
      },
      condition: () => !isPhone.value
    },
    {
      align: "center",
      title: "Permissions",
      key: "permissions",
      minWidth: 150,
      scopedSlots: { customRender: "permissions" }
    },
    {
      align: "center",
      title: t("TXT_CODE_fe731dfc"),
      key: "operation",
      minWidth: 200,
      scopedSlots: { customRender: "operation" }
    }
  ]);
});
</script>

<template>
  <div class="access-settings-container">
    <div v-if="userUuid" class="settings-content">
      <!-- Header Section -->
      <div class="settings-header">
        <div class="header-info">
          <div class="header-icon">
            <AppstoreOutlined />
          </div>
          <div class="header-text">
            <h2>{{ t("TXT_CODE_76d20724") }}</h2>
            <span class="header-subtitle">{{ dataSource.length }} instance{{ dataSource.length !== 1 ? 's' : '' }} assigned</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn secondary" @click="refreshTableData()">
            <ReloadOutlined />
            <span v-if="!isPhone">{{ t("TXT_CODE_b76d94e0") }}</span>
          </button>
          <button class="action-btn primary" @click="assignApp">
            <PlusOutlined />
            <span>{{ t("TXT_CODE_9393b484") }}</span>
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="table-container">
        <a-table
          :scroll="{ x: 'max-content' }"
          :data-source="dataSource"
          :columns="columns"
          :pagination="{ pageSize: 10, showSizeChanger: true }"
          class="modern-table"
        >
          <template #bodyCell="{ column, record, index }: AntTableCell">
            <template v-if="column.key === 'permissions'">
              <button class="permissions-btn" @click="openPermissionsDialog(record, index)">
                <SettingOutlined />
                <span>{{ getPermissionCount(record) }}</span>
              </button>
            </template>
            <template v-if="column.key === 'operation'">
              <a-popconfirm :title="t('TXT_CODE_71155575')" @confirm="handleDelete(record)">
                <button class="delete-btn">
                  <DeleteOutlined />
                  <span>{{ t("TXT_CODE_ecbd7449") }}</span>
                </button>
              </a-popconfirm>
            </template>
          </template>
        </a-table>

        <!-- Empty State -->
        <div v-if="dataSource.length === 0" class="empty-state">
          <div class="empty-icon">
            <InboxOutlined />
          </div>
          <h4>No Instances Assigned</h4>
          <p>Assign instances to give this user access to manage them</p>
          <button class="action-btn primary" @click="assignApp">
            <PlusOutlined />
            <span>Assign First Instance</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Instance Permissions Dialog -->
  <a-modal
    v-model:open="permissionsDialog.visible"
    :title="'Edit Permissions: ' + permissionsDialog.instanceName"
    :footer="null"
    width="700px"
    class="permissions-modal"
    @cancel="handlePermissionDialogCancel"
  >
    <div class="permissions-content">
      <!-- File Operations -->
      <div class="permission-section">
        <div class="section-header">
          <DatabaseOutlined />
          <span>File Operations</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canUploadFiles }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canUploadFiles" />
            <span>Upload</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canDownloadFiles }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canDownloadFiles" />
            <span>Download</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canDeleteFiles }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canDeleteFiles" />
            <span>Delete</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canModifyFiles }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canModifyFiles" />
            <span>Modify</span>
          </label>
        </div>
      </div>

      <!-- Instance Control -->
      <div class="permission-section">
        <div class="section-header">
          <ControlOutlined />
          <span>Instance Control</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessConsole }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessConsole" />
            <span>Console</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canStartInstances }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canStartInstances" />
            <span>Start</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canStopInstances }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canStopInstances" />
            <span>Stop</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canRestartInstances }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canRestartInstances" />
            <span>Restart</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canTerminateInstances }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canTerminateInstances" />
            <span>Terminate</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canViewLogs }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canViewLogs" />
            <span>View Logs</span>
          </label>
        </div>
      </div>

      <!-- Management Access -->
      <div class="permission-section">
        <div class="section-header">
          <SettingOutlined />
          <span>Management Access</span>
        </div>
        <div class="permissions-grid">
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessFileManager }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessFileManager" />
            <span>File Manager</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessConfigFiles }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessConfigFiles" />
            <span>Config Files</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessMinecraftQuery }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessMinecraftQuery" />
            <span>MC Query</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessTerminalSettings }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessTerminalSettings" />
            <span>Terminal</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessScheduledTasks }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessScheduledTasks" />
            <span>Scheduled Tasks</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessEventTasks }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessEventTasks" />
            <span>Event Tasks</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessInstanceSettings }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessInstanceSettings" />
            <span>Instance Settings</span>
          </label>
          <label class="permission-item" :class="{ active: permissionsDialog.permissions.canAccessServerMarket }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.canAccessServerMarket" />
            <span>Server Market</span>
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
          <label class="permission-item restriction" :class="{ active: permissionsDialog.permissions.disableRightClick }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.disableRightClick" />
            <span>Disable Right Click</span>
          </label>
          <label class="permission-item restriction" :class="{ active: permissionsDialog.permissions.disableKeyboardShortcuts }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.disableKeyboardShortcuts" />
            <span>Disable Shortcuts</span>
          </label>
          <label class="permission-item restriction" :class="{ active: permissionsDialog.permissions.disableTextSelection }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.disableTextSelection" />
            <span>Disable Selection</span>
          </label>
          <label class="permission-item restriction" :class="{ active: permissionsDialog.permissions.disableCopy }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.disableCopy" />
            <span>Disable Copy</span>
          </label>
          <label class="permission-item restriction" :class="{ active: permissionsDialog.permissions.disablePaste }">
            <a-checkbox v-model:checked="permissionsDialog.permissions.disablePaste" />
            <span>Disable Paste</span>
          </label>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="handlePermissionDialogCancel">Cancel</button>
        <button class="btn-save" :disabled="permissionsDialog.loading" @click="saveInstancePermissions">
          {{ permissionsDialog.loading ? 'Saving...' : 'Save Permissions' }}
        </button>
      </div>
    </div>
  </a-modal>
</template>

<style lang="scss" scoped>
.access-settings-container {
  height: 100%;
  padding: 24px;
}

.settings-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header Section */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: var(--background-color-white);
  border: 1px solid var(--gray-border-color);
  border-radius: 12px;
}

.header-info {
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

.header-text h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.header-subtitle {
  font-size: 13px;
  color: var(--color-gray-7);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* Action Buttons */
.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  color: white;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
}

.action-btn.secondary {
  background: var(--background-color-white);
  border: 1px solid var(--gray-border-color);
  color: var(--text-color);
}

.action-btn.secondary:hover {
  background: var(--color-gray-4);
}

/* Table Container */
.table-container {
  flex: 1;
  background: var(--background-color-white);
  border: 1px solid var(--gray-border-color);
  border-radius: 12px;
  padding: 20px;
  overflow: hidden;
}

/* Modern Table Styles */
.modern-table {
  :deep(.ant-table) {
    background: transparent;
    color: var(--text-color);
  }

  :deep(.ant-table-thead > tr > th) {
    background: var(--color-gray-4);
    border-bottom: 1px solid var(--gray-border-color);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-gray-8);
  }

  :deep(.ant-table-tbody > tr > td) {
    border-bottom: 1px solid var(--gray-border-color);
    padding: 16px;
    color: var(--text-color);
    background: var(--background-color-white);
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: var(--color-gray-4);
  }

  :deep(.ant-pagination) {
    color: var(--text-color);
  }

  :deep(.ant-pagination-item a) {
    color: var(--text-color);
  }

  :deep(.ant-pagination-item-active a) {
    color: #ff8c00;
  }

  :deep(.ant-select-selector) {
    background: var(--color-gray-4) !important;
    border-color: var(--gray-border-color) !important;
    color: var(--text-color) !important;
  }

  :deep(.ant-select-arrow) {
    color: var(--color-gray-8);
  }

  :deep(.ant-empty-description) {
    color: var(--color-gray-7);
  }
}

/* Delete Button */
.delete-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.delete-btn:hover {
  background: rgba(255, 77, 79, 0.2);
  border-color: rgba(255, 77, 79, 0.5);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 24px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  border-radius: 20px;
  background: var(--color-gray-4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: var(--color-gray-7);
}

.empty-state h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.empty-state p {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--color-gray-7);
}

/* Permissions Button */
.permissions-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 140, 0, 0.1);
  border: 1px solid rgba(255, 140, 0, 0.3);
  border-radius: 6px;
  color: #ff8c00;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.permissions-btn:hover {
  background: rgba(255, 140, 0, 0.2);
  border-color: rgba(255, 140, 0, 0.5);
}

/* Permissions Modal */
.permissions-content {
  padding: 16px 0;
}

.permission-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-gray-4);
  border-radius: 8px;
  border: 1px solid var(--gray-border-color);
}

.permission-section.security-section {
  border-color: rgba(250, 173, 20, 0.3);
  background: rgba(250, 173, 20, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--text-color);
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--background-color-white);
  border: 1px solid var(--gray-border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.permission-item:hover {
  border-color: #ff8c00;
}

.permission-item.active {
  border-color: #ff8c00;
  background: rgba(255, 140, 0, 0.1);
}

.permission-item.restriction.active {
  border-color: #faad14;
  background: rgba(250, 173, 20, 0.15);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--gray-border-color);
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid var(--gray-border-color);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  border-color: var(--color-gray-7);
}

.btn-save {
  padding: 8px 16px;
  border: none;
  background: linear-gradient(135deg, #ff8c00 0%, #ff6b00 100%);
  border-radius: 6px;
  cursor: pointer;
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Responsive */
@media (max-width: 768px) {
  .access-settings-container {
    padding: 16px;
  }

  .settings-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
  }

  .permissions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
