<script setup lang="ts">
import { ref } from "vue";
import { Modal } from "ant-design-vue";
import {
  CloudUploadOutlined,
  ContainerOutlined,
  SettingOutlined,
  RocketOutlined
} from "@ant-design/icons-vue";
import { router } from "@/config/router";
import { QUICKSTART_ACTION_TYPE, QUICKSTART_METHOD } from "@/hooks/widgets/quickStartFlow";
import { openNodeSelectDialog } from "@/components/fc/index";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "create": [data: { createMethod: QUICKSTART_METHOD; appType: QUICKSTART_ACTION_TYPE; daemonId: string }];
}>();

const handleCreateOption = async (createMethod: QUICKSTART_METHOD, appType: QUICKSTART_ACTION_TYPE) => {
  try {
    // First select the node
    const selectedNode = await openNodeSelectDialog();
    if (!selectedNode) return;

    closeModal();

    // Emit the creation data to parent
    emit("create", {
      createMethod,
      appType,
      daemonId: selectedNode.uuid
    });
  } catch (error) {
    console.error(error);
  }
};

const createOptions = [
  {
    id: "compressed",
    icon: CloudUploadOutlined,
    title: "Import Compressed Package",
    description: "Automatically create an instance by uploading a server compressed package. Only .zip files are supported. It will be automatically decompressed after upload.",
    color: "#1890ff",
    action: () => handleCreateOption(QUICKSTART_METHOD.IMPORT, QUICKSTART_ACTION_TYPE.SteamGameServer)
  },
  {
    id: "docker",
    icon: ContainerOutlined,
    title: "Create with Docker Image",
    description: "Docker needs to be installed in advance. Then, use any image you found on DockerHub to create, install, and start the instance.",
    color: "#0db7ed",
    action: () => handleCreateOption(QUICKSTART_METHOD.DOCKER, QUICKSTART_ACTION_TYPE.SteamGameServer)
  },
  {
    id: "direct",
    icon: SettingOutlined,
    title: "Create Directly",
    description: "Create an instance directly without uploading any files. Configure it later. This is suitable for experienced users.",
    color: "#52c41a",
    action: () => handleCreateOption(QUICKSTART_METHOD.EXIST, QUICKSTART_ACTION_TYPE.AnyApp)
  }
];

const closeModal = () => {
  emit("update:open", false);
};
</script>

<template>
  <Modal
    :open="props.open"
    :footer="null"
    :width="800"
    @cancel="closeModal"
  >
    <template #title>
      <div class="modal-header">
        <RocketOutlined class="header-icon" />
        <span>Create New Instance</span>
      </div>
    </template>

    <div class="create-options-container">
      <p class="subtitle">Choose how you want to create your instance</p>

      <div class="options-grid">
        <div
          v-for="option in createOptions"
          :key="option.id"
          class="option-card"
          @click="option.action"
        >
          <div class="option-icon" :style="{ background: `${option.color}15`, color: option.color }">
            <component :is="option.icon" />
          </div>
          <h3 class="option-title">{{ option.title }}</h3>
          <p class="option-description">{{ option.description }}</p>
          <div class="option-arrow">→</div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped lang="scss">
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;

  .header-icon {
    font-size: 24px;
    color: #D4AF37;
  }
}

.create-options-container {
  padding: 8px 0;

  .subtitle {
    color: var(--color-gray-8);
    margin-bottom: 24px;
    font-size: 14px;
  }

  .options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .option-card {
    background: var(--background-color-white);
    border: 2px solid var(--card-border-color);
    border-radius: 12px;
    padding: 24px 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-color: #D4AF37;

      .option-arrow {
        transform: translateX(4px);
        opacity: 1;
      }

      .option-icon {
        transform: scale(1.1) rotate(5deg);
      }
    }

    &:active {
      transform: translateY(-2px);
    }

    .option-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 16px;
      transition: all 0.3s ease;
    }

    .option-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-color);
      margin-bottom: 8px;
    }

    .option-description {
      font-size: 13px;
      color: var(--color-gray-8);
      line-height: 1.5;
      margin: 0;
    }

    .option-arrow {
      position: absolute;
      bottom: 20px;
      right: 20px;
      font-size: 20px;
      font-weight: bold;
      color: var(--color-gray-8);
      opacity: 0.5;
      transition: all 0.3s ease;
    }
  }
}
</style>
