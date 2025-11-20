<script setup lang="ts">
import { ref, reactive } from "vue";
import { t } from "@/lang/i18n";
import type { InstanceDetail } from "@/types";
import { updateInstanceConfig } from "@/services/apis/instance";
import { message, type FormInstance } from "ant-design-vue";
import { reportErrorMsg } from "@/tools/validator";

const formRef = ref<FormInstance>();

const props = defineProps<{
  instanceInfo?: InstanceDetail;
  instanceId?: string;
  daemonId?: string;
}>();

const emit = defineEmits(["update"]);
const formData = reactive({
  ip: "",
  port: "",
  type: 1
});

const open = ref(false);
const openDialog = () => {
  open.value = true;
  formData.ip = props.instanceInfo?.config?.pingConfig.ip || "";
  formData.port = String(props.instanceInfo?.config?.pingConfig.port || "");
  formData.type = props.instanceInfo?.config?.pingConfig.type ?? 1;
};

const { execute, isLoading } = updateInstanceConfig();

const submit = async () => {
  try {
    await formRef.value?.validateFields();
    await execute({
      params: {
        uuid: props.instanceId ?? "",
        daemonId: props.daemonId ?? ""
      },
      data: {
        pingConfig: {
          ip: formData.ip,
          port: Number(formData.port),
          type: formData.type
        }
      }
    });
    emit("update");
    open.value = false;
    return message.success(t("TXT_CODE_d3de39b4"));
  } catch (err: any) {
    return reportErrorMsg(err.message);
  }
};

defineExpose({
  openDialog
});
</script>

<template>
  <a-modal
    v-model:open="open"
    centered
    :width="800"
    :title="t('TXT_CODE_40241d8e')"
    :confirm-loading="isLoading"
    :ok-text="t('TXT_CODE_abfe9512')"
    @ok="submit"
  >
    <a-form ref="formRef" :model="formData" layout="vertical">
      <!-- Info Card - LANDSCAPE -->
      <div class="mcping-info-card">
        <div class="mcping-info-row">
          <div class="mcping-info-icon">🎮</div>
          <div class="mcping-info-content">
            <p class="mcping-info-text">{{ t("TXT_CODE_57d1929e") }}</p>
            <p class="mcping-info-text">{{ t("TXT_CODE_6b175558") }}</p>
          </div>
        </div>
      </div>

      <!-- Server Configuration Card - LANDSCAPE -->
      <div class="mcping-settings-card">
        <div class="mcping-settings-row">
          <div class="mcping-settings-title-section">
            <h4 class="mcping-settings-title">Server Configuration</h4>
            <p class="mcping-settings-subtitle">Configure Minecraft server query settings</p>
          </div>
          <div class="mcping-settings-controls">
            <a-form-item name="port" class="mcping-form-item">
              <div class="mcping-control-label">
                <span class="mcping-label-text">{{ t("TXT_CODE_f49149d0") }}</span>
                <span class="mcping-label-hint">{{ t("TXT_CODE_2ab036a4") }}</span>
              </div>
              <a-input
                v-model:value="formData.port"
                :placeholder="t('TXT_CODE_e2dc0156')"
                style="width: 180px"
              />
            </a-form-item>
            <a-form-item name="ip" class="mcping-form-item">
              <div class="mcping-control-label">
                <span class="mcping-label-text">{{ t("TXT_CODE_2f59807a") }}</span>
                <span class="mcping-label-hint">{{ t("TXT_CODE_8e2be926") }}</span>
              </div>
              <a-input
                v-model:value="formData.ip"
                :placeholder="t('TXT_CODE_ddc2de99')"
                style="width: 240px"
              />
            </a-form-item>
          </div>
        </div>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped lang="scss">
/* LANDSCAPE Minecraft Ping Settings Cards - ORANGE GOLD BLACK THEME */
.mcping-info-card {
  background: linear-gradient(135deg, #1a1a00 0%, #2a2200 100%);
  border: 2px solid #ff8c00;
  border-radius: 12px;
  padding: 16px; /* OCD: 16px all around */
  margin-bottom: 16px; /* OCD: 16px between cards */
}

.mcping-info-row {
  display: flex;
  align-items: center;
  gap: 16px; /* OCD: 16px gap */
}

.mcping-info-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.mcping-info-content {
  flex: 1;
}

.mcping-info-text {
  margin: 0 0 4px 0;
  padding: 0;
  font-size: 13px;
  color: #ffd700; /* GOLD */
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
}

.mcping-settings-card {
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  border: 2px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px; /* OCD: 24px all around */
  transition: all 0.3s ease;

  &:hover {
    border-color: #ff8c00; /* ORANGE on hover */
    box-shadow: 0 4px 16px rgba(255, 140, 0, 0.15);
  }
}

.mcping-settings-row {
  display: flex;
  align-items: center; /* OCD: Vertically centered */
  gap: 32px; /* OCD: 32px between sections */
  justify-content: space-between;
}

.mcping-settings-title-section {
  flex: 0 0 240px; /* OCD: Fixed 240px width */
  min-width: 240px;
}

.mcping-settings-title {
  margin: 0 0 4px 0; /* OCD: 4px gap */
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  color: #ffd700; /* GOLD */
  line-height: 1.4;
}

.mcping-settings-subtitle {
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: #999999;
  line-height: 1.4;
}

.mcping-settings-controls {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 24px; /* OCD: 24px between controls */
  align-items: flex-start;
}

.mcping-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px; /* OCD: 8px between label and input */
  margin-bottom: 0 !important;
}

.mcping-control-label {
  display: flex;
  flex-direction: column;
  gap: 4px; /* OCD: 4px between text and hint */
}

.mcping-label-text {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.2;
}

.mcping-label-hint {
  font-size: 12px;
  color: #666666;
  line-height: 1.2;
}

/* RESPONSIVE: Stack vertically on mobile */
@media (max-width: 768px) {
  .mcping-settings-row {
    flex-direction: column;
    align-items: stretch;
    gap: 16px; /* OCD: Tighter gap on mobile */
  }

  .mcping-settings-title-section {
    flex: none;
    min-width: 0;
  }

  .mcping-settings-controls {
    flex-direction: column;
    gap: 16px;
  }

  .mcping-form-item {
    width: 100%;
  }

  .mcping-form-item input {
    width: 100% !important;
  }
}

/* Customize Ant Design for ORANGE GOLD BLACK theme */
:deep(.mcping-settings-card) {
  .ant-input:hover,
  .ant-input:focus {
    border-color: #ff8c00; /* ORANGE */
  }

  .ant-input:focus {
    box-shadow: 0 0 0 2px rgba(255, 140, 0, 0.2);
  }
}
</style>
