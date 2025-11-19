<script setup lang="ts">
import { useInstanceInfo } from "@/hooks/useInstance";
import { t } from "@/lang/i18n";
import type { LayoutCard } from "@/types";
import PermissionBanner from "@/components/PermissionBanner.vue";
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons-vue";
import { computed, onMounted, ref } from "vue";
import { GLOBAL_INSTANCE_NAME } from "../../config/const";
import { useLayoutCardTools } from "../../hooks/useCardTools";
import { parseTimestamp } from "../../tools/time";
import DockerInfo from "./dialogs/DockerInfo.vue";

const props = defineProps<{
  card: LayoutCard;
}>();

const DockerInfoDialog = ref<InstanceType<typeof DockerInfo>>();
const { getMetaOrRouteValue } = useLayoutCardTools(props.card);

const instanceId = getMetaOrRouteValue("instanceId");
const daemonId = getMetaOrRouteValue("daemonId");

const { statusText, isRunning, isStopped, instanceTypeText, instanceInfo, execute } =
  useInstanceInfo({
    instanceId,
    daemonId,
    autoRefresh: true
  });

const getInstanceName = computed(() => {
  if (instanceInfo.value?.config.nickname === GLOBAL_INSTANCE_NAME) {
    return t("TXT_CODE_5bdaf23d");
  } else {
    return instanceInfo.value?.config.nickname;
  }
});

const instanceGameServerInfo = computed(() => {
  if (instanceInfo.value?.info?.mcPingOnline) {
    return {
      players: `${instanceInfo.value?.info.currentPlayers} / ${instanceInfo.value?.info.maxPlayers}`,
      version: instanceInfo.value?.info.version
    };
  } else {
    return null;
  }
});

onMounted(async () => {
  if (instanceId && daemonId) {
    await execute({
      params: {
        uuid: instanceId,
        daemonId: daemonId
      }
    });
  }
});
</script>

<template>
  <!-- eslint-disable vue/html-indent -->
  <CardPanel class="containerWrapper modern-info-panel" style="height: 100%">
    <template #title>
      {{ card.title }}
    </template>
    <template #body>
      <PermissionBanner type="instance" theme="orange" />

      <!-- Game Server Info (if applicable) -->
      <div v-if="instanceGameServerInfo" class="game-server-section">
        <div class="info-card">
          <div class="info-label">{{ t("TXT_CODE_855c4a1c") }}</div>
          <div class="info-value">{{ instanceGameServerInfo.players }}</div>
        </div>
        <div class="info-card">
          <div class="info-label">{{ t("TXT_CODE_e260a220") }}</div>
          <div class="info-value">{{ instanceGameServerInfo.version }}</div>
        </div>
      </div>

      <!-- Docker Info -->
      <div v-if="instanceInfo?.config.processType === 'docker'" class="docker-section">
        <div class="info-card clickable" @click="DockerInfoDialog?.openDialog()">
          <div class="info-label">{{ t("TXT_CODE_4f917a65") }}</div>
          <a href="javascript:;" class="info-link">{{ t("TXT_CODE_530f5951") }}</a>
        </div>
      </div>

      <!-- Allocated Ports -->
      <div v-if="Number(instanceInfo?.info?.allocatedPorts?.length) > 0" class="ports-section">
        <div class="section-title">{{ t("TXT_CODE_2e4469f6") }}</div>
        <div class="ports-grid">
          <div
            v-for="(item, index) in instanceInfo?.info?.allocatedPorts"
            :key="index"
            class="port-card"
          >
            <a-tag color="green" class="protocol-tag">{{ item.protocol.toUpperCase() }}</a-tag>
            <div class="port-info">
              <span class="port-label">{{ t("TXT_CODE_8dfc41ef") }}:</span>
              <span class="port-value">{{ item.host }}</span>
            </div>
            <div class="port-info">
              <span class="port-label">{{ t("TXT_CODE_8f8103b7") }}:</span>
              <span class="port-value">{{ item.container }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Instance Details Grid -->
      <div class="details-grid">
        <div class="info-card">
          <div class="info-label">{{ t("TXT_CODE_ae747cc0") }}</div>
          <div class="info-value">{{ parseTimestamp(instanceInfo?.config.endTime) || t("TXT_CODE_e3a77a77") }}</div>
        </div>

        <div v-if="!instanceGameServerInfo" class="info-card">
          <div class="info-label">{{ t("TXT_CODE_8b8e08a6") }}</div>
          <div class="info-value">{{ parseTimestamp(instanceInfo?.config.createDatetime) }}</div>
        </div>

        <div class="info-card">
          <div class="info-label">{{ t("TXT_CODE_46f575ae") }}</div>
          <div class="info-value">{{ parseTimestamp(instanceInfo?.config.lastDatetime) }}</div>
        </div>

        <div v-if="!instanceGameServerInfo" class="info-card encoding-card">
          <div class="encoding-group">
            <div class="info-label">{{ t("TXT_CODE_cec321b4") }}</div>
            <div class="info-value">{{ instanceInfo?.config.oe.toUpperCase() }}</div>
          </div>
          <div class="encoding-group">
            <div class="info-label">{{ t("TXT_CODE_400a4210") }}</div>
            <div class="info-value">{{ instanceInfo?.config.ie.toUpperCase() }}</div>
          </div>
        </div>
      </div>

      <!-- IDs Section -->
      <div class="ids-section">
        <div class="id-card">
          <div class="id-label">{{ t("TXT_CODE_30051f9b") }}</div>
          <div class="id-value">
            <a-typography-text :copyable="{ text: instanceInfo?.instanceUuid }">
              {{ instanceInfo?.instanceUuid }}
            </a-typography-text>
          </div>
        </div>
        <div class="id-card">
          <div class="id-label">{{ t("TXT_CODE_5f2d2e30") }}</div>
          <div class="id-value">
            <a-typography-text :copyable="{ text: daemonId }">
              {{ daemonId }}
            </a-typography-text>
          </div>
        </div>
      </div>
    </template>
  </CardPanel>

  <DockerInfo ref="DockerInfoDialog" :docker-info="instanceInfo?.config.docker" />
</template>

<style lang="scss" scoped>
// MODERN INFO PANEL
.modern-info-panel {
  :deep(.card-panel-content) {
    overflow-y: auto;
    padding: 12px;
  }
}

// INSTANCE HEADER
.info-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(255, 140, 66, 0.4);
}

.instance-name {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #FF8C42 0%, #D4AF37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.instance-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.modern-tag {
  font-weight: 600;
  border-radius: 8px;
  padding: 4px 12px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
}

// INFO CARD BASE
.info-card {
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(40, 40, 40, 0.85) 100%);
  border: 1.5px solid rgba(255, 140, 66, 0.3);
  border-radius: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 140, 66, 0.25);
    border-color: rgba(255, 140, 66, 0.5);
    background: linear-gradient(135deg, rgba(20, 20, 20, 1) 0%, rgba(40, 40, 40, 1) 100%);
  }

  &.clickable {
    cursor: pointer;

    &:active {
      transform: translateY(0);
    }
  }
}

.info-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 140, 66, 0.7);
  margin-bottom: 6px;
}

.info-value {
  font-size: 15px;
  font-weight: 700;
  color: #D4AF37;
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.info-link {
  font-size: 14px;
  font-weight: 600;
  color: #FF8C42;
  text-decoration: underline;

  &:hover {
    color: #FF9C52;
  }
}

// GAME SERVER SECTION
.game-server-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

// DOCKER SECTION
.docker-section {
  margin-bottom: 16px;
}

// PORTS SECTION
.ports-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #FF8C42;
  margin-bottom: 10px;
  padding-left: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.ports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.port-card {
  padding: 12px 14px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(40, 40, 40, 0.8) 100%);
  border: 1.5px solid rgba(255, 140, 66, 0.3);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
    border-color: rgba(255, 140, 66, 0.5);
    background: linear-gradient(135deg, rgba(20, 20, 20, 1) 0%, rgba(40, 40, 40, 1) 100%);
  }
}

.protocol-tag {
  align-self: flex-start;
  font-weight: 700;
  border-radius: 6px;
  margin-bottom: 4px;
}

.port-info {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.port-label {
  font-weight: 600;
  color: rgba(255, 140, 66, 0.7);
}

.port-value {
  font-weight: 700;
  color: #D4AF37;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

// DETAILS GRID
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.encoding-card {
  display: flex;
  gap: 16px;
}

.encoding-group {
  flex: 1;
}

// IDS SECTION
.ids-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.id-card {
  padding: 12px 14px;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(40, 40, 40, 0.8) 100%);
  border: 1.5px solid rgba(255, 140, 66, 0.3);
  border-radius: 10px;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 140, 66, 0.5);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
    background: linear-gradient(135deg, rgba(20, 20, 20, 1) 0%, rgba(40, 40, 40, 1) 100%);
  }
}

.id-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(255, 140, 66, 0.7);
  margin-bottom: 6px;
}

.id-value {
  font-size: 13px;
  font-weight: 600;
  color: #D4AF37;
  font-family: monospace;
  word-break: break-all;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);

  :deep(.ant-typography) {
    color: #D4AF37;
  }
}

// RESPONSIVE
@media (max-width: 992px) {
  .details-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .ports-grid {
    grid-template-columns: 1fr;
  }

  .ids-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .instance-name {
    font-size: 18px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .game-server-section {
    grid-template-columns: 1fr;
  }

  .encoding-card {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
