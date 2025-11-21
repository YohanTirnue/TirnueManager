<script setup lang="ts">
import type { OpenMarketDialogProps } from "@/components/fc";
import { useDialog } from "@/hooks/useDialog";
import { t } from "@/lang/i18n";
import { reinstallInstance } from "@/services/apis/instance";
import { remoteAllInstances } from "@/services/apis";
import { reportErrorMsg } from "@/tools/validator";
import type { MountComponent, QuickStartPackages, InstanceDetail } from "@/types";
import AppPackages from "@/widgets/setupApp/AppPackages.vue";
import { Modal, message } from "ant-design-vue";
import { ref } from "vue";

interface Props extends OpenMarketDialogProps, MountComponent<QuickStartPackages> {}

const props = defineProps<Props>();

const { isVisible, openDialog: open, cancel, submit } = useDialog<QuickStartPackages>(props);

const openDialog = async () => {
  appPackages.value?.init();
  return await open();
};

const appPackages = ref<InstanceType<typeof AppPackages>>();

// Instance selection state
const showInstanceSelector = ref(false);
const userInstances = ref<any[]>([]);
const selectedInstance = ref<{ uuid: string; daemonId: string } | null>(null);
const pendingTemplate = ref<QuickStartPackages | null>(null);
const loadingInstances = ref(false);

const fetchUserInstances = async () => {
  loadingInstances.value = true;
  try {
    const { execute, state } = remoteAllInstances();
    await execute({
      params: {
        page: 1,
        page_size: 100,
        status: "",
        instance_name: "",
        tag: "[]"
      }
    });
    userInstances.value = state.value?.data || [];
  } catch (err) {
    console.error("Failed to fetch instances:", err);
    userInstances.value = [];
  } finally {
    loadingInstances.value = false;
  }
};

const handleSelectInstance = (instance: any) => {
  selectedInstance.value = {
    uuid: instance.instanceUuid,
    daemonId: instance.daemonId
  };
};

const confirmInstallToInstance = async () => {
  if (!selectedInstance.value || !pendingTemplate.value) {
    message.error("Please select an instance");
    return;
  }

  Modal.confirm({
    title: t("TXT_CODE_617ce69c"),
    content: "WARNING: This will DELETE ALL FILES in the selected instance and replace it with the new server template. This action cannot be undone.",
    okText: t("TXT_CODE_ed3fc23"),
    okType: "danger",
    async onOk() {
      try {
        await reinstallInstance().execute({
          params: {
            daemonId: selectedInstance.value!.daemonId,
            uuid: selectedInstance.value!.uuid
          },
          data: {
            targetUrl: pendingTemplate.value!.targetLink,
            title: pendingTemplate.value!.title,
            description: pendingTemplate.value!.description
          }
        });
        message.success("Server replacement started successfully");
        showInstanceSelector.value = false;
        await submit(pendingTemplate.value);
      } catch (err: any) {
        console.error(err);
        return reportErrorMsg(err.message);
      }
    }
  });
};

const cancelInstanceSelection = () => {
  showInstanceSelector.value = false;
  selectedInstance.value = null;
  pendingTemplate.value = null;
};

const handleSelectTemplate = async (item: QuickStartPackages | null) => {
  if (!item) {
    return submit(undefined);
  }
  if (!props.autoInstall) {
    await submit(item);
    return;
  }

  // If instanceId is provided, use the original flow
  if (props.instanceId && props.daemonId) {
    Modal.confirm({
      title: t("TXT_CODE_617ce69c"),
      content: t("TXT_CODE_94f1ba3"),
      okText: t("TXT_CODE_ed3fc23"),
      async onOk() {
        try {
          await reinstallInstance().execute({
            params: {
              daemonId: props.daemonId || "",
              uuid: props.instanceId || ""
            },
            data: {
              targetUrl: item.targetLink,
              title: item.title,
              description: item.description
            }
          });
          await submit(item);
        } catch (err: any) {
          console.error(err);
          return reportErrorMsg(err.message);
        }
      }
    });
  } else {
    // Show instance selection dialog
    pendingTemplate.value = item;
    selectedInstance.value = null;
    await fetchUserInstances();
    showInstanceSelector.value = true;
  }
};

defineExpose({
  openDialog
});
</script>

<template>
  <a-modal
    v-model:open="isVisible"
    centered
    width="1600px"
    :cancel-text="t('TXT_CODE_3b1cc020')"
    :mask-closable="false"
    :confirm-loading="false"
    :footer="null"
    @cancel="cancel"
  >
    <AppPackages
      ref="appPackages"
      :btn-text="btnText"
      :title="dialogTitle"
      :show-custom-btn="showCustomBtn"
      :only-docker-template="onlyDockerTemplate"
      @handle-select-template="handleSelectTemplate"
    />
  </a-modal>

  <!-- Instance Selection Modal -->
  <a-modal
    v-model:open="showInstanceSelector"
    centered
    width="600px"
    title="Select Instance to Replace"
    :mask-closable="false"
    @cancel="cancelInstanceSelection"
  >
    <template #footer>
      <a-button @click="cancelInstanceSelection">Cancel</a-button>
      <a-button
        type="primary"
        danger
        :disabled="!selectedInstance"
        @click="confirmInstallToInstance"
      >
        Replace Selected Instance
      </a-button>
    </template>

    <div v-if="loadingInstances" class="instance-loading">
      <a-spin />
      <span>Loading your instances...</span>
    </div>

    <div v-else-if="userInstances.length === 0" class="no-instances">
      <a-empty description="No instances found" />
    </div>

    <div v-else class="instance-selector-list">
      <p class="selector-description">
        Select which instance you want to replace with <strong>{{ pendingTemplate?.title }}</strong>:
      </p>
      <div class="instance-list">
        <div
          v-for="instance in userInstances"
          :key="instance.instanceUuid"
          class="instance-item"
          :class="{ selected: selectedInstance?.uuid === instance.instanceUuid }"
          @click="handleSelectInstance(instance)"
        >
          <div class="instance-info">
            <div class="instance-name">{{ instance.config?.nickname || 'Unnamed Instance' }}</div>
            <div class="instance-details">
              <span class="daemon-info">{{ instance.daemonRemarks || instance.daemonIp || 'Unknown Daemon' }}</span>
              <span class="status-badge" :class="instance.status === 3 ? 'running' : 'stopped'">
                {{ instance.status === 3 ? 'Running' : 'Stopped' }}
              </span>
            </div>
          </div>
          <div v-if="selectedInstance?.uuid === instance.instanceUuid" class="check-icon">✓</div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.instance-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
}

.no-instances {
  padding: 40px;
}

.instance-selector-list {
  padding: 8px 0;
}

.selector-description {
  margin-bottom: 16px;
  color: var(--color-gray-8);
}

.instance-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.instance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 2px solid var(--color-gray-4);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.instance-item:hover {
  border-color: #FF8C42;
  background: rgba(255, 140, 66, 0.05);
}

.instance-item.selected {
  border-color: #FF8C42;
  background: rgba(255, 140, 66, 0.1);
}

.instance-info {
  flex: 1;
}

.instance-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--color-gray-11);
  margin-bottom: 4px;
}

.instance-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.daemon-info {
  color: var(--color-gray-7);
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.running {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.status-badge.stopped {
  background: rgba(250, 173, 20, 0.1);
  color: #faad14;
}

.check-icon {
  font-size: 18px;
  color: #FF8C42;
  font-weight: bold;
}
</style>
