<script setup lang="ts">
import { ref, watch } from "vue";
import { h } from "vue";
import { t } from "@/lang/i18n";
import { CrownOutlined, UserOutlined, TeamOutlined } from "@ant-design/icons-vue";
import { getInstanceTeams } from "@/services/apis";
import { reportErrorMsg } from "@/tools/validator";

interface SubUser {
  uuid: string;
  userName: string;
  permissions?: any;
  registerTime: string;
  loginTime: string;
}

interface TeamData {
  parent: {
    uuid: string;
    userName: string;
    permission: number;
  };
  subUsers: SubUser[];
}

const props = defineProps<{
  visible: boolean;
  daemonId: string;
  instanceUuid: string;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
}>();

const teams = ref<TeamData[]>([]);
const loading = ref(false);

watch(
  () => props.visible,
  (newVal) => {
    if (newVal) {
      fetchTeams();
    }
  }
);

const fetchTeams = async () => {
  loading.value = true;
  try {
    const res = await getInstanceTeams().execute({
      params: {
        daemonId: props.daemonId,
        instanceUuid: props.instanceUuid
      }
    });
    teams.value = res.value || [];
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  emit("update:visible", false);
};

const getPermissionSummary = (permissions: any): string => {
  if (!permissions) return "Default permissions";
  const enabled = [];
  if (permissions.canStartInstances) enabled.push("Start");
  if (permissions.canStopInstances) enabled.push("Stop");
  if (permissions.canRestartInstances) enabled.push("Restart");
  if (permissions.canAccessConsole) enabled.push("Console");
  if (permissions.canViewLogs) enabled.push("Logs");
  if (permissions.canAccessFileManager) enabled.push("Files");
  return enabled.length > 0 ? enabled.join(", ") : "No permissions";
};
</script>

<template>
  <a-modal
    :open="visible"
    title="Instance Team Structure"
    :width="900"
    @cancel="handleClose"
  >
    <template #footer>
      <a-button @click="handleClose">{{ t("TXT_CODE_d507abff") }}</a-button>
    </template>

    <a-spin :spinning="loading">
      <div v-if="teams.length > 0" class="teams-container">
        <div v-for="team in teams" :key="team.parent.uuid" class="team-card">
          <div class="parent-user">
            <a-avatar :style="{ backgroundColor: '#FF8C42', marginRight: '12px' }">
              <template #icon>
                <CrownOutlined />
              </template>
            </a-avatar>
            <div class="user-info">
              <div class="user-name">
                {{ team.parent.userName }}
                <a-tag color="orange">Parent User</a-tag>
              </div>
              <div class="user-meta">
                Permission Level: {{ team.parent.permission }}
              </div>
            </div>
          </div>

          <a-divider v-if="team.subUsers.length > 0" style="margin: 12px 0">
            Sub-Users ({{ team.subUsers.length }}/3)
          </a-divider>

          <div v-if="team.subUsers.length > 0" class="sub-users-list">
            <div
              v-for="subUser in team.subUsers"
              :key="subUser.uuid"
              class="sub-user-item"
            >
              <a-avatar
                :style="{ backgroundColor: '#1890ff', marginRight: '12px' }"
                size="small"
              >
                <template #icon>
                  <UserOutlined />
                </template>
              </a-avatar>
              <div class="user-info">
                <div class="user-name">
                  {{ subUser.userName }}
                  <a-tag color="blue" size="small">Sub-User</a-tag>
                </div>
                <div class="user-meta">
                  <div>Created: {{ subUser.registerTime }}</div>
                  <div v-if="subUser.loginTime">Last Login: {{ subUser.loginTime }}</div>
                  <div class="permissions-summary">
                    Permissions: {{ getPermissionSummary(subUser.permissions) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a-empty
            v-else
            description="No sub-users created"
            :image-style="{ height: '40px' }"
            style="margin: 0"
          />
        </div>
      </div>
      <a-empty v-else description="No teams found for this instance" />
    </a-spin>
  </a-modal>
</template>

<style scoped>
.teams-container {
  max-height: 600px;
  overflow-y: auto;
}

.team-card {
  background: #fafafa;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.parent-user,
.sub-user-item {
  display: flex;
  align-items: flex-start;
  padding: 8px;
  border-radius: 4px;
}

.parent-user {
  background: rgba(255, 140, 66, 0.1);
  margin-bottom: 12px;
}

.sub-user-item {
  background: white;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-meta {
  font-size: 12px;
  color: #666;
}

.permissions-summary {
  margin-top: 4px;
  color: #1890ff;
}

.sub-users-list {
  margin-top: 8px;
}
</style>
