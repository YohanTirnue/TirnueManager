<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { openNodeSelectDialog } from "@/components/fc/index";
import { router } from "@/config/router";
import { useLayoutCardTools } from "@/hooks/useCardTools";
import { QUICKSTART_ACTION_TYPE, QUICKSTART_METHOD } from "@/hooks/widgets/quickStartFlow";
import { t } from "@/lang/i18n";
import { useAppStateStore } from "@/stores/useAppStateStore";
import type { LayoutCard } from "@/types";
import CreateInstanceForm from "@/widgets/setupApp/CreateInstanceForm.vue";
import {
  AppstoreAddOutlined,
  BlockOutlined,
  FileZipOutlined,
  FolderOpenOutlined
} from "@ant-design/icons-vue";
import { ref } from "vue";
import McPreset from "./setupApp/McPreset.vue";

const props = defineProps<{
  card: LayoutCard;
}>();

const { isAdmin } = useAppStateStore();

const { getMetaOrRouteValue } = useLayoutCardTools(props.card);
const daemonId = getMetaOrRouteValue("daemonId", false) ?? "";

// 表单数据状态
const formData = ref({
  appType: QUICKSTART_ACTION_TYPE.AnyApp,
  createMethod: QUICKSTART_METHOD.DOCKER,
  daemonId: daemonId || ""
});

// 弹窗状态
const showCreateForm = ref(false);

const handleNext = (instanceUuid: string) => {
  showCreateForm.value = false;
  // 创建成功后跳转到实例终端页面
  router.push({
    path: "/instances/terminal",
    query: {
      daemonId: formData.value.daemonId,
      instanceId: instanceUuid
    }
  });
};

const handleInstallAction = async (
  createMethod: QUICKSTART_METHOD,
  appType: QUICKSTART_ACTION_TYPE
) => {
  formData.value.createMethod = createMethod;
  formData.value.appType = appType;
  try {
    const selectedNode = await openNodeSelectDialog();
    if (!selectedNode) return;
    formData.value.daemonId = selectedNode.uuid;
    showCreateForm.value = true;
  } catch (error) {
    console.error(error);
  }
};

const manualInstallOptions = [
  {
    label: t("TXT_CODE_a3efb1cc"),
    icon: FileZipOutlined,
    description: t("TXT_CODE_f09da050"),
    action: () =>
      handleInstallAction(QUICKSTART_METHOD.IMPORT, QUICKSTART_ACTION_TYPE.SteamGameServer)
  },
  {
    label: t("TXT_CODE_bae487e4"),
    icon: BlockOutlined,
    description: t("TXT_CODE_256e5825"),
    action: () =>
      handleInstallAction(QUICKSTART_METHOD.DOCKER, QUICKSTART_ACTION_TYPE.SteamGameServer)
  },
  {
    label: t("TXT_CODE_e0fca76"),
    icon: FolderOpenOutlined,
    description: t("TXT_CODE_b3844cf8"),
    action: () => handleInstallAction(QUICKSTART_METHOD.EXIST, QUICKSTART_ACTION_TYPE.AnyApp)
  }
];
</script>

<template>
  <div style="height: 100%">
    <div v-if="isAdmin" style="margin-bottom: 30px">
      <a-typography-title :level="4" style="margin-bottom: 8px">
        <AppstoreAddOutlined />
        {{ t("TXT_CODE_5a74975b") }}
      </a-typography-title>
      <a-typography-paragraph>
        <p>
          {{ t("TXT_CODE_81ad9e80") }}
        </p>
      </a-typography-paragraph>
      <div class="manual-install-options">
        <a-row :gutter="[16, 16]">
          <a-col
            v-for="(option, index) in manualInstallOptions"
            :key="index"
            :span="24"
            :md="12"
            :lg="8"
          >
            <CardPanel class="install-option-card" :style="{}" @click="option.action">
              <template #title>
                <div class="card-header">
                  <div class="card-title">{{ option.label }}</div>
                </div>
              </template>
              <template #body>
                <div class="icon-wrapper">
                  <component :is="option.icon" />
                </div>
                <div class="card-description">
                  {{ option.description }}
                </div>

                <div class="card-action">
                  <a-button type="primary" @click="option.action">
                    <div class="flex items-center">
                      {{ t("TXT_CODE_7b2c5414") }}
                    </div>
                  </a-button>
                </div>
              </template>
            </CardPanel>
          </a-col>
        </a-row>
      </div>
    </div>
    <div><McPreset :card="card" /></div>

    <!-- 创建实例表单弹窗 -->
    <a-modal
      v-model:open="showCreateForm"
      :title="t('TXT_CODE_645bc545')"
      :width="800"
      :footer="null"
      :destroy-on-close="true"
    >
      <CreateInstanceForm
        :app-type="formData.appType"
        :create-method="formData.createMethod"
        :daemon-id="formData.daemonId"
        @next-step="handleNext"
      />
    </a-modal>
  </div>
</template>

<style lang="scss" scoped>
.manual-install-options {
  margin: 24px auto;
}

.install-option-card {
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  will-change: transform;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.05), rgba(212, 175, 55, 0.05));
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(255, 140, 66, 0.3);
    box-shadow: 0 8px 24px rgba(255, 140, 66, 0.2);

    &::before {
      opacity: 1;
    }

    .icon-wrapper {
      color: #FF8C42;
      opacity: 0.3;
      transform: rotate(-1deg) scale(1.1);
    }

    .card-action :deep(.ant-btn) {
      background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
      border-color: transparent;
      color: white;
      box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
    }
  }

  .card-header {
    display: flex;
    align-items: center;

    .card-title {
      font-size: 17px;
      font-weight: 600;
      background: linear-gradient(135deg, #FF8C42, #D4AF37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      flex: 1;
    }
  }

  .card-description {
    color: var(--color-gray-8);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 16px;
    flex: 1;
  }

  .card-action {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    margin-right: 4px;

    :deep(.ant-btn) {
      border-radius: 10px;
      font-weight: 600;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: 2px solid rgba(255, 140, 66, 0.3);
      color: #FF8C42;

      &:hover {
        transform: translateY(-2px);
      }
    }
  }

  .icon-wrapper {
    position: absolute;
    left: 2px;
    bottom: 0;
    color: var(--color-gray-8);
    opacity: 0.15;
    font-size: 80px;
    transform: rotate(-1deg);
    transition: transform 0.3s ease, color 0.3s ease, opacity 0.3s ease;
    will-change: transform, opacity;
  }
}
</style>
