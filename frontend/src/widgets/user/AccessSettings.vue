<script setup lang="ts">
import type { LayoutCard } from "@/types";
import type { UserInstance } from "@/types/user";
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
import {
  AppstoreOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  InboxOutlined
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
    if (selectedInstances) dataSource.value = selectedInstances;
    await saveData();
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
          <template #bodyCell="{ column, record }: AntTableCell">
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
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
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
  color: var(--color-text-1);
}

.header-subtitle {
  font-size: 13px;
  color: var(--color-text-3);
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
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);
}

.action-btn.secondary:hover {
  background: var(--color-bg-4);
}

/* Table Container */
.table-container {
  flex: 1;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  padding: 20px;
  overflow: hidden;
}

/* Modern Table Styles */
.modern-table {
  :deep(.ant-table) {
    background: transparent;
  }

  :deep(.ant-table-thead > tr > th) {
    background: var(--color-bg-3);
    border-bottom: 1px solid var(--color-border-2);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-2);
  }

  :deep(.ant-table-tbody > tr > td) {
    border-bottom: 1px solid var(--color-border-2);
    padding: 16px;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: var(--color-bg-3);
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
  background: var(--color-bg-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: var(--color-text-3);
}

.empty-state h4 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-1);
}

.empty-state p {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--color-text-3);
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
}
</style>
