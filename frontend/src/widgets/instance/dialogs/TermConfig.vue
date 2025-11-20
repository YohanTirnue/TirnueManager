<script setup lang="ts">
import { ref, computed } from "vue";
import { t } from "@/lang/i18n";
import { useScreen } from "@/hooks/useScreen";
import type { InstanceDetail } from "@/types";
import { updateInstanceConfig } from "@/services/apis/instance";
import { message } from "ant-design-vue";
import { reportErrorMsg } from "@/tools/validator";
import { TERMINAL_CODE } from "@/types/const";

const props = defineProps<{
  instanceInfo?: InstanceDetail;
  instanceId?: string;
  daemonId?: string;
}>();
const emit = defineEmits(["update"]);
const options = ref<InstanceDetail>();

const screen = useScreen();
const isPhone = computed(() => screen.isPhone.value);
const open = ref(false);
const openDialog = () => {
  open.value = true;
  options.value = props.instanceInfo;
};

const { execute, isLoading } = updateInstanceConfig();

const submit = async () => {
  try {
    await execute({
      params: {
        uuid: props.instanceId ?? "",
        daemonId: props.daemonId ?? ""
      },
      data: {
        terminalOption: options.value?.config.terminalOption,
        crlf: options.value?.config.crlf,
        ie: options.value?.config.ie,
        oe: options.value?.config.oe,
        stopCommand: options.value?.config.stopCommand
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
    :width="isPhone ? '100%' : '900px'"
    :title="t('TXT_CODE_d23631cb')"
    :confirm-loading="isLoading"
    :ok-text="t('TXT_CODE_abfe9512')"
    @ok="submit"
  >
    <a-form v-if="options" layout="vertical">
      <!-- Terminal Mode Card - LANDSCAPE -->
      <div class="term-settings-card">
        <div class="term-settings-row">
          <div class="term-settings-title-section">
            <h4 class="term-settings-title">Terminal Mode</h4>
            <p class="term-settings-subtitle">Configure terminal emulation and display</p>
          </div>
          <div class="term-settings-controls">
            <div class="term-control-item">
              <div class="term-control-label">
                <span class="term-label-text">{{ t("TXT_CODE_ef650d57") }}</span>
                <span class="term-label-hint">{{ t("TXT_CODE_feeea328") }}</span>
              </div>
              <a-switch v-model:checked="options.config.terminalOption.pty" size="default" />
            </div>
            <div class="term-control-item">
              <div class="term-control-label">
                <span class="term-label-text">{{ t("TXT_CODE_e1a3b150") }}</span>
                <span class="term-label-hint">{{ t("TXT_CODE_6a515e35") }}</span>
              </div>
              <a-switch v-model:checked="options.config.terminalOption.haveColor" size="default" />
            </div>
          </div>
        </div>
      </div>

      <!-- Encoding & Control Card - LANDSCAPE -->
      <div class="term-settings-card">
        <div class="term-settings-row">
          <div class="term-settings-title-section">
            <h4 class="term-settings-title">Encoding & Control</h4>
            <p class="term-settings-subtitle">Character encoding and command settings</p>
          </div>
          <div class="term-settings-controls">
            <div class="term-control-item">
              <div class="term-control-label">
                <span class="term-label-text">{{ t("TXT_CODE_b91a94f9") }}</span>
                <span class="term-label-hint">{{ t("TXT_CODE_5b2daea0") }}</span>
              </div>
              <a-select
                v-model:value="options.config.crlf"
                :placeholder="t('TXT_CODE_3bb646e4')"
                style="width: 140px"
              >
                <a-select-option :value="1">{{ t("TXT_CODE_365aabd4") }}</a-select-option>
                <a-select-option :value="2">{{ t("TXT_CODE_20cec54") }}</a-select-option>
              </a-select>
            </div>
            <div class="term-control-item">
              <div class="term-control-label">
                <span class="term-label-text">{{ t("TXT_CODE_11cfe3a1") }}</span>
                <span class="term-label-hint">{{ t("TXT_CODE_7ec7ccb8") }}</span>
              </div>
              <a-input
                v-model:value="options.config.stopCommand"
                style="width: 140px"
                :placeholder="'^C'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Character Encoding Card - LANDSCAPE -->
      <div class="term-settings-card">
        <div class="term-settings-row">
          <div class="term-settings-title-section">
            <h4 class="term-settings-title">Character Encoding</h4>
            <p class="term-settings-subtitle">Input and output encoding formats</p>
          </div>
          <div class="term-settings-controls">
            <div class="term-control-item">
              <div class="term-control-label">
                <span class="term-label-text">{{ t("TXT_CODE_449d1581") }}</span>
                <span class="term-label-hint">{{ t("TXT_CODE_d16d82ab") }}</span>
              </div>
              <div class="term-encoding-group">
                <a-select
                  v-model:value="options.config.ie"
                  :placeholder="t('TXT_CODE_bd2559f3')"
                  style="width: 120px"
                >
                  <a-select-option v-for="item in TERMINAL_CODE" :key="item" :value="item">
                  </a-select-option>
                </a-select>
                <a-select
                  v-model:value="options.config.oe"
                  :placeholder="t('TXT_CODE_6e96b2a9')"
                  style="width: 120px"
                >
                  <a-select-option v-for="item in TERMINAL_CODE" :key="item" :value="item">
                  </a-select-option>
                </a-select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-form>
  </a-modal>
</template>

<style scoped lang="scss">
/* LANDSCAPE Terminal Settings Cards - ORANGE GOLD BLACK THEME */
.term-settings-card {
  background: var(--theme-card-bg);
  border: 2px solid var(--theme-card-border);
  border-radius: 12px;
  padding: 24px; /* OCD: 24px all around */
  margin-bottom: 16px; /* OCD: 16px between cards */
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--theme-card-border-hover);
    background: var(--theme-card-bg-hover);
    box-shadow: 0 4px 16px var(--theme-shadow-hover);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.term-settings-row {
  display: flex;
  align-items: center; /* OCD: Vertically centered */
  gap: 32px; /* OCD: 32px between title and controls */
  justify-content: space-between;
}

.term-settings-title-section {
  flex: 0 0 240px; /* OCD: Fixed 240px width */
  min-width: 240px;
}

.term-settings-title {
  margin: 0 0 4px 0; /* OCD: 4px gap */
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--theme-title-color);
  line-height: 1.4;
}

.term-settings-subtitle {
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: var(--theme-subtitle-color);
  line-height: 1.4;
}

.term-settings-controls {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 24px; /* OCD: 24px between controls */
  align-items: center;
}

.term-control-item {
  display: flex;
  align-items: center;
  gap: 16px; /* OCD: 16px between label and control */
}

.term-control-label {
  display: flex;
  flex-direction: column;
  gap: 4px; /* OCD: 4px between text and hint */
  min-width: 160px;
}

.term-label-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-label-color);
  line-height: 1.2;
}

.term-label-hint {
  font-size: 12px;
  color: var(--theme-hint-color);
  line-height: 1.2;
}

.term-encoding-group {
  display: flex;
  gap: 8px; /* OCD: 8px between selects */
  align-items: center;
}

/* RESPONSIVE: Stack vertically on mobile */
@media (max-width: 768px) {
  .term-settings-row {
    flex-direction: column;
    align-items: stretch;
    gap: 16px; /* OCD: Tighter gap on mobile */
  }

  .term-settings-title-section {
    flex: none;
    min-width: 0;
  }

  .term-settings-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 16px; /* OCD: Consistent mobile gap */
  }

  .term-control-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px; /* OCD: Tighter mobile gap */
  }

  .term-control-label {
    min-width: 0;
  }

  .term-encoding-group {
    flex-direction: column;
    gap: 8px;

    .ant-select {
      width: 100% !important;
    }
  }
}

/* Customize Ant Design components to match theme */
:deep(.ant-switch-checked) {
  background: var(--theme-card-border-hover);
}

:deep(.ant-select:not(.ant-select-disabled):hover .ant-select-selector) {
  border-color: var(--theme-card-border-hover);
}

:deep(.ant-select-focused:not(.ant-select-disabled).ant-select .ant-select-selector) {
  border-color: var(--theme-card-border-hover);
  box-shadow: 0 0 0 2px var(--theme-focus-shadow);
}

:deep(.ant-input:hover) {
  border-color: var(--theme-card-border-hover);
}

:deep(.ant-input:focus) {
  border-color: var(--theme-card-border-hover);
  box-shadow: 0 0 0 2px var(--theme-focus-shadow);
}
</style>
