<script setup lang="ts">
import { t } from "@/lang/i18n";
import { onMounted, ref } from "vue";
import { h } from "vue";
import type { LayoutCard } from "@/types";
import { userInfoApi } from "@/services/apis/index";
import { useRouter } from "vue-router";
import { INSTANCE_STATUS, INSTANCE_STATUS_CODE } from "@/types/const";
import { parseTimestamp } from "../tools/time";
import PermissionBanner from "@/components/PermissionBanner.vue";
import SubUserManager from "@/components/SubUserManager.vue";
import { TeamOutlined } from "@ant-design/icons-vue";
import { useAppStateStore } from "@/stores/useAppState";

defineProps<{
  card: LayoutCard;
}>();

const router = useRouter();
const appStateStore = useAppStateStore();

const { execute, state } = userInfoApi();
const subUserManagerVisible = ref(false);
const selectedInstance = ref({ daemonId: "", instanceUuid: "" });

const columns = [
  {
    title: t("TXT_CODE_f70badb9"),
    dataIndex: "nickname",
    key: "nickname"
  },
  {
    title: t("TXT_CODE_5476e012"),
    dataIndex: "status",
    key: "status",
    customRender: (e: { text: INSTANCE_STATUS_CODE }) => {
      return INSTANCE_STATUS[e.text] || e.text;
    }
  },
  {
    title: t("TXT_CODE_5ab2062d"),
    dataIndex: "lastDatetime",
    key: "lastDatetime",
    customRender: (e: { text: number }) => {
      return parseTimestamp(e.text);
    }
  },
  {
    title: t("TXT_CODE_fa920c0"),
    dataIndex: "endTime",
    key: "endTime",
    customRender: (e: { text: number }) => {
      return parseTimestamp(e.text) || t("TXT_CODE_abc080d");
    }
  },
  {
    title: t("TXT_CODE_fe731dfc"),
    key: "operate"
  }
];

const getInstanceList = async () => {
  await execute({
    params: {
      advanced: true
    }
  });
};

const operate = (daemonId: string, instanceId: string) => {
  router.push({
    path: "/instances/terminal",
    query: {
      daemonId,
      instanceId
    }
  });
};

const openSubUserManager = (daemonId: string, instanceUuid: string) => {
  selectedInstance.value = { daemonId, instanceUuid };
  subUserManagerVisible.value = true;
};

const canManageSubUsers = () => {
  const userInfo = appStateStore.state.userInfo;
  // Admins and regular users (not sub-users) can manage sub-users
  return userInfo && !userInfo.isSubUser && (userInfo.permission === 10 || userInfo.permission === 1);
};

onMounted(() => {
  getInstanceList();
});
</script>

<template>
  <CardPanel>
    <template #title>{{ card.title }}</template>
    <template #body>
      <PermissionBanner type="instance" theme="orange" />
      <a-table
        :data-source="state?.instances"
        :columns="columns"
        :pagination="false"
        :scroll="{ x: 'max-content' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'operate'">
            <a-space>
              <a-button
                :disabled="record.status === INSTANCE_STATUS_CODE.BUSY"
                @click="operate(record.daemonId, record.instanceUuid)"
              >
                {{ t("TXT_CODE_aa43b248") }}
              </a-button>
              <a-button
                v-if="canManageSubUsers()"
                :icon="h(TeamOutlined)"
                @click="openSubUserManager(record.daemonId, record.instanceUuid)"
              >
                Manage Sub-Users
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </template>
  </CardPanel>

  <!-- Sub-User Manager Modal -->
  <SubUserManager
    v-model:visible="subUserManagerVisible"
    :daemon-id="selectedInstance.daemonId"
    :instance-uuid="selectedInstance.instanceUuid"
    @refresh="getInstanceList"
  />
</template>
