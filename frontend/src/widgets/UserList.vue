<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { t } from "@/lang/i18n";
import { message, Modal, type FormInstance } from "ant-design-vue";
import { DownOutlined, UserOutlined, SearchOutlined } from "@ant-design/icons-vue";
import type { Rule } from "ant-design-vue/es/form";
import { throttle } from "lodash";
import CardPanel from "@/components/CardPanel.vue";
import BetweenMenus from "@/components/BetweenMenus.vue";
import { useScreen } from "../hooks/useScreen";
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
import type { AntColumnsType, AntTableCell } from "../types/ant";
import type { Key } from "ant-design-vue/es/_util/type";
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
const { isPhone } = useScreen();

const operationForm = ref({
  name: "",
  currentPage: 1,
  pageSize: 20
});

const columns = computed(() => {
  return arrayFilter<AntColumnsType>([
    {
      align: "center",
      title: "UUID",
      dataIndex: "uuid",
      key: "uuid",
      condition: () => !isPhone.value
    },
    {
      align: "center",
      title: t("TXT_CODE_eb9fcdad"),
      dataIndex: "userName",
      key: "userName",
      minWidth: 200
    },
    {
      align: "center",
      title: t("TXT_CODE_511aea70"),
      dataIndex: "permission",
      key: "permission",
      minWidth: 200,
      customRender: (e: { text: "1" | "10" | "-1" }) => {
        return PERMISSION_MAP[e.text] || e.text;
      }
    },
    {
      align: "center",
      title: t("TXT_CODE_d7ee9ba"),
      dataIndex: "loginTime",
      key: "loginTime",
      minWidth: 200,
      condition: () => !isPhone.value
    },
    {
      align: "center",
      title: t("TXT_CODE_c5c56801"),
      dataIndex: "registerTime",
      key: "registerTime",
      minWidth: 200,
      condition: () => !isPhone.value
    },
    {
      align: "center",
      title: t("TXT_CODE_fe731dfc"),
      key: "action",
      minWidth: 200
    }
  ]);
});

const total = ref(0);
const data = ref<dataType>();
const dataSource = computed(() => data?.value?.data);
const selectedUsers = ref<string[]>([]);
const currentRole = ref("");

const handleToUserResources = (user: BaseUserInfo) => {
  toPage({
    path: "/users/resources",
    query: {
      uuid: user.uuid
    }
  });
};

const handleTableChange = (e: { current: number; pageSize: number }) => {
  operationForm.value.currentPage = e.current;
  operationForm.value.pageSize = e.pageSize;
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
};

const handleBatchDelete = async () => {
  if (selectedUsers.value.length === 0) {
    return message.warn(t("TXT_CODE_d78ad17a"));
  }
  await deleteUser(selectedUsers.value);
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
            permission: formData.value.permission
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
  open2FA: false
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

// Add user
const handleAddUser = async () => {
  userDialog.value.title = t("TXT_CODE_e83ffa03");
  formData.value = _.cloneDeep(formDataOrigin);
  isAddMode.value = true;
  userDialog.value.show();
};

// Edit user
const handleEditUser = (user: BaseUserInfo) => {
  userDialog.value.title = t("TXT_CODE_79f9a172");
  formData.value = _.cloneDeep(user);
  isAddMode.value = false;
  userDialog.value.show();
};

const search = throttle(async () => {
  operationForm.value.currentPage = 1;
  await fetchData();
}, 600);

onMounted(async () => {
  fetchData();
});
</script>

<template>
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

  <div style="height: 100%" class="user-list-container">
    <a-row :gutter="[24, 24]" style="height: 100%">
      <a-col :span="24">
        <BetweenMenus>
          <template v-if="!isPhone" #left>
            <a-typography-title class="mb-0 page-title" :level="4">
              <UserOutlined />
              {{ card.title }} ({{ total }})
            </a-typography-title>
          </template>
          <template #right>
            <a-button class="action-btn" :loading="getUserInfoLoading" @click="reload">
              {{ t("TXT_CODE_b76d94e0") }}
            </a-button>
            <a-button class="action-btn primary-btn" type="primary" @click="handleAddUser">
              {{ t("TXT_CODE_e83ffa03") }}
            </a-button>
            <a-button class="action-btn delete-btn" danger @click="handleBatchDelete()">
              {{ t("TXT_CODE_ecbd7449") }}
            </a-button>
          </template>
          <template #center>
            <div class="search-input">
              <a-input-group compact>
                <a-select v-model:value="currentRole" class="role-filter" style="width: 120px" @change="search()">
                  <a-select-option value="">
                    {{ t("TXT_CODE_c48f6f64") }}
                  </a-select-option>
                  <a-select-option v-for="(p, i) in PERMISSION_MAP" :key="i" :value="i">
                    {{ p }}
                  </a-select-option>
                </a-select>
                <a-input
                  v-model:value.trim.lazy="operationForm.name"
                  :placeholder="t('TXT_CODE_2471b9c')"
                  allow-clear
                  class="search-field"
                  style="width: calc(100% - 120px)"
                  @change="search()"
                >
                  <template #prefix>
                    <SearchOutlined style="color: #FF8C42" />
                  </template>
                </a-input>
              </a-input-group>
            </div>
          </template>
        </BetweenMenus>
      </a-col>
      <a-col :span="24">
        <CardPanel style="height: 100%">
          <template #body>
            <a-spin :spinning="data && data.pageSize == 0">
              <a-table
                :row-selection="{
                  selectedRowKeys: selectedUsers,
                  onChange: (selectedRowKeys: Key[]) => {
                    selectedUsers = selectedRowKeys as string[];
                  }
                }"
                :data-source="dataSource"
                :columns="columns"
                :preserve-selected-row-keys="true"
                :row-key="(record: BaseUserInfo) => record.uuid"
                :pagination="{
                  current: operationForm.currentPage,
                  pageSize: operationForm.pageSize,
                  hideOnSinglePage: false,
                  total: total,
                  showSizeChanger: true
                }"
                @change="
                  handleTableChange({
                    current: $event.current || 0,
                    pageSize: $event.pageSize || 0
                  })
                "
              >
                <template #bodyCell="{ column, record }: AntTableCell">
                  <template v-if="column.key === 'action'">
                    <a-space>
                      <a-button class="table-action-btn" size="small" @click="handleEditUser(record)">
                        {{ t("TXT_CODE_236f70aa") }}
                      </a-button>
                      <a-button class="table-action-btn" size="small" @click="handleToUserResources(record)">
                        {{ t("TXT_CODE_4d934e3a") }}
                      </a-button>
                      <a-button class="table-action-btn" size="small" danger @click="showDeleteConfirm(record)">
                        {{ t("TXT_CODE_ecbd7449") }}
                      </a-button>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </a-spin>
          </template>
        </CardPanel>
      </a-col>
    </a-row>
  </div>
</template>

<style lang="scss" scoped>
.user-list-container {
  padding: 16px;
}

.page-title {
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-btn {
  transition: all 0.2s ease;
  border-radius: 6px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.2);
  }

  &.primary-btn {
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    border: none;

    &:hover {
      background: linear-gradient(135deg, #ff9d5c, #dfc051);
    }
  }

  &.delete-btn {
    &:hover {
      box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3);
    }
  }
}

.search-input {
  transition: all 0.4s;
  text-align: center;
  width: 100%;

  .role-filter {
    border-radius: 6px 0 0 6px;
  }

  .search-field {
    border-radius: 0 6px 6px 0;

    &:focus {
      border-color: #FF8C42;
      box-shadow: 0 0 0 2px rgba(255, 140, 66, 0.1);
    }
  }

  @media (max-width: 992px) {
    width: 100% !important;
  }
}

.table-action-btn {
  transition: all 0.2s ease;
  border-radius: 4px;
  font-size: 12px;

  &:hover:not([danger]) {
    border-color: #FF8C42;
    color: #FF8C42;
  }
}

:deep(.ant-table) {
  .ant-table-thead > tr > th {
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.05), rgba(212, 175, 55, 0.05));
    border-bottom: 2px solid rgba(255, 140, 66, 0.2);
    font-weight: 600;
  }

  .ant-table-tbody > tr:hover > td {
    background: rgba(255, 140, 66, 0.03);
  }
}

@media (max-width: 768px) {
  .user-list-container {
    padding: 12px;
  }

  .table-action-btn {
    font-size: 11px;
    padding: 2px 8px;
  }
}
</style>
