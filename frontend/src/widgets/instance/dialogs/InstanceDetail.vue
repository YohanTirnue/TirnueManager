<script setup lang="ts">
import { useDockerEnvEditDialog, usePortEditDialog, useVolumeEditDialog } from "@/components/fc";
import { useAppRouters } from "@/hooks/useAppRouters";
import { INSTANCE_TYPE_TRANSLATION } from "@/hooks/useInstance";
import { useScreen } from "@/hooks/useScreen";
import { t } from "@/lang/i18n";
import { getNetworkModeList, imageList } from "@/services/apis/envImage";
import { updateAnyInstanceConfig } from "@/services/apis/instance";
import { dockerPortsArray } from "@/tools/common";
import { reportErrorMsg } from "@/tools/validator";
import type { DockerNetworkModes, InstanceDetail } from "@/types";
import { TERMINAL_CODE } from "@/types/const";
import { CheckOutlined, CloseOutlined, SafetyOutlined, WarningOutlined } from "@ant-design/icons-vue";
import type { FormInstance } from "ant-design-vue";
import { message } from "ant-design-vue";
import type { Rule } from "ant-design-vue/es/form";
import type { DefaultOptionType } from "ant-design-vue/es/select";
import { Dayjs } from "dayjs";
import _ from "lodash";
import { computed, ref, unref } from "vue";
import { GLOBAL_INSTANCE_NAME } from "../../../config/const";
import { dayjsToTimestamp, timestampToDayjs } from "../../../tools/time";

interface FormDetail extends InstanceDetail {
  dayjsEndTime?: Dayjs;
  networkAliasesText: string;
  imageSelectMethod: "SELECT" | "EDIT";
}

const props = defineProps<{
  instanceInfo?: InstanceDetail;
  instanceId?: string;
  daemonId?: string;
}>();

// eslint-disable-next-line no-unused-vars
enum TabSettings {
  // eslint-disable-next-line no-unused-vars
  Basic = "Basic",
  // eslint-disable-next-line no-unused-vars
  Docker = "Docker",
  // eslint-disable-next-line no-unused-vars
  Advanced = "Advanced",
  // eslint-disable-next-line no-unused-vars
  ResLimit = "ResLimit"
}

const emit = defineEmits(["update"]);

const { toPage } = useAppRouters();
const activeKey = ref<TabSettings>(TabSettings.Basic);
const options = ref<FormDetail>();
const screen = useScreen();
const isPhone = computed(() => screen.isPhone.value);
const open = ref(false);
const { execute: executeGetNetworkModeList } = getNetworkModeList();
const networkModes = ref<DockerNetworkModes[]>([]);
const { execute, isLoading } = updateAnyInstanceConfig();
const formRef = ref<FormInstance>();
const { execute: getImageList } = imageList();
const dockerImages = ref<{ label: string; value: string }[]>([]);

const IMAGE_DEFINE = {
  NEW: "__MCSM_NEW_IMAGE__",
  EDIT: "__MCSM_EDIT_IMAGE__"
};

const updateCommandDesc = t("TXT_CODE_fa487a47");
const UPDATE_CMD_TEMPLATE =
  t("TXT_CODE_61ca492b") +
  `"C:/SteamCMD/steamcmd.exe" +login anonymous +force_install_dir "{mcsm_workspace}" "+app_update 380870 validate" +quit`;
const initFormDetail = () => {
  if (props.instanceInfo) {
    options.value = {
      ...props.instanceInfo,
      dayjsEndTime: timestampToDayjs(props.instanceInfo?.config?.endTime),
      networkAliasesText: props.instanceInfo?.config?.docker.networkAliases?.join(",") || "",
      imageSelectMethod: "SELECT"
    };
  }
};

const isGlobalTerminal = computed(() => {
  return props.instanceInfo?.config.nickname === GLOBAL_INSTANCE_NAME;
});

const isDockerMode = computed(() => options.value?.config.processType === "docker");

const loadImages = async () => {
  dockerImages.value = [
    {
      label: t("TXT_CODE_435f4975"),
      value: IMAGE_DEFINE.EDIT
    }
  ];

  try {
    const images = await getImageList({
      params: {
        daemonId: props.daemonId ?? ""
      },
      method: "GET"
    });

    if (images.value) {
      for (const iterator of images.value) {
        const repoTags = iterator?.RepoTags?.[0];
        if (repoTags)
          dockerImages.value.push({
            label: repoTags,
            value: repoTags
          });
      }
    }
  } catch (err: any) {
    // ignore
  }
};

const selectImage = (row: DefaultOptionType) => {
  const image = row.value;
  if (typeof image === "string" && image === IMAGE_DEFINE.NEW) {
    toPage({
      path: `/node/image?daemonId=${props.daemonId}`
    });
    return;
  }
  if (image === IMAGE_DEFINE.EDIT && options.value) {
    options.value.config.docker.image = "";
    options.value.imageSelectMethod = "EDIT";
    return;
  }
};

const loadNetworkModes = async () => {
  try {
    const modes = await executeGetNetworkModeList({
      params: {
        daemonId: props.daemonId ?? ""
      }
    });
    if (modes.value) networkModes.value = modes.value;
  } catch (err: any) {
    // ignore
  }
};

const openDialog = async () => {
  open.value = true;
  initFormDetail();
  await Promise.all([loadImages(), loadNetworkModes()]);
};

const rules: Record<string, any> = {
  nickname: [{ required: true, message: t("TXT_CODE_68a504b3") }],
  startCommand: [
    {
      required: true,
      validator: async (_rule: Rule, value: string) => {
        if (value.includes("\n")) throw new Error(t("TXT_CODE_bbbda29"));
      },
      trigger: "change"
    }
  ],
  cwd: [{ required: true, message: t("TXT_CODE_71c948a9") }],
  basePort: [
    {
      validator: async (_rule: Rule, value: number) => {
        if (value !== undefined && value !== null && value !== 0) {
          if (value < 0 || value > 65535) {
            throw new Error(t("TXT_CODE_12040bf0"));
          }
        }
      },
      trigger: "change"
    }
  ],
  docker: {
    image: [
      {
        required: true,
        validator: async (_rule: Rule, value: string) => {
          if (!isDockerMode.value) return;
          const ErrMsg =
            options.value?.imageSelectMethod === "EDIT"
              ? t("TXT_CODE_9fed23ab")
              : t("TXT_CODE_be6484f7");
          if (value === "") throw new Error(ErrMsg);
        },
        trigger: "change"
      }
    ],
    networkMode: [
      {
        validator: async (_rule: Rule, value: string) => {
          if (!isDockerMode.value) return;
          if (value === "") throw new Error(t("TXT_CODE_b52cb76c"));
        }
      }
    ]
  },
  dockerImage: []
};

const submit = async () => {
  try {
    await formRef.value?.validateFields();
    if (!options.value?.config) throw new Error("");
    const postData = encodeFormData();
    await execute({
      params: {
        uuid: props.instanceId ?? "",
        daemonId: props.daemonId ?? ""
      },
      data: postData.config
    });
    emit("update");
    open.value = false;
    return message.success(t("TXT_CODE_d3de39b4"));
  } catch (error: any) {
    console.error(error);
    return reportErrorMsg(error.message ?? t("TXT_CODE_9911ac11"));
  }
};

const encodeFormData = () => {
  const postData = _.cloneDeep(unref(options));
  if (postData) {
    postData.config.endTime = dayjsToTimestamp(postData.dayjsEndTime);
    postData.config.docker.networkAliases = postData.networkAliasesText
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v !== "");
    return postData;
  }
  throw new Error("Ref Options is null");
};

const handleEditDockerConfig = async (type: "port" | "volume" | "env") => {
  if (type === "port" && options.value?.config) {
    // "25565:25565/tcp 8080:8080/tcp" -> Array
    const portArray = dockerPortsArray(options.value?.config.docker.ports || []);
    const result = await usePortEditDialog(portArray);
    const portsArray = result.map((v) => `${v.host}:${v.container}/${v.protocol}`);
    options.value.config.docker.ports = portsArray;
  }

  if (type === "volume" && options.value?.config) {
    const volumes = options.value.config.docker.extraVolumes?.map((v) => {
      const tmp = v.split("|");
      return {
        host: tmp[0] || "",
        container: tmp[1] || ""
      };
    });
    const result = await useVolumeEditDialog(volumes);
    const volumesArray = result.map((v) => `${v.host}|${v.container}`);
    options.value.config.docker.extraVolumes = volumesArray;
  }

  if (type === "env" && options.value?.config) {
    const envs = options.value.config.docker.env?.map((v) => {
      const tmp = v.split("=");
      return {
        label: tmp[0] || "",
        value: tmp[1] || ""
      };
    });
    const result = await useDockerEnvEditDialog(envs);
    const envsArray = result.map((v) => `${v.label}=${v.value}`);
    options.value.config.docker.env = envsArray;
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
    :mask-closable="false"
    :width="isPhone ? '100%' : '1200px'"
    :title="t('TXT_CODE_aac98b2a')"
    :confirm-loading="isLoading"
    :ok-text="t('TXT_CODE_abfe9512')"
    @ok="submit"
  >
    <div class="dialog-overflow-container">
      <a-tooltip :title="t('TXT_CODE_cdf7c16a')" placement="top">
        <a-typography-text type="secondary" class="typography-text-ellipsis">
          {{ t("TXT_CODE_cdf7c16a") }}
        </a-typography-text>
      </a-tooltip>
      <div>
        <a-tabs v-model:activeKey="activeKey">
          <a-tab-pane :key="TabSettings.Basic" :tab="t('TXT_CODE_cc7b54b9')"></a-tab-pane>
          <a-tab-pane :key="TabSettings.Advanced" :tab="t('TXT_CODE_31a1d824')"></a-tab-pane>
          <a-tab-pane
            v-if="!isGlobalTerminal"
            :key="TabSettings.Docker"
            :tab="t('TXT_CODE_afb12200')"
          ></a-tab-pane>
          <a-tab-pane
            v-if="!isGlobalTerminal"
            :key="TabSettings.ResLimit"
            :tab="t('TXT_CODE_604d8d63')"
          ></a-tab-pane>
        </a-tabs>
      </div>
      <a-form
        v-if="options"
        ref="formRef"
        :model="options.config"
        :rules="rules"
        layout="vertical"
        autocomplete="off"
      >
        <a-row v-if="activeKey === TabSettings.Basic" :gutter="20">
          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item name="nickname">
              <a-typography-title :level="5" class="require-field">
                {{ t("TXT_CODE_f70badb9") }}
              </a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_818928ba')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_818928ba") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input v-model:value="options.config.nickname" :disabled="isGlobalTerminal" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5" class="require-field">
                {{ t("TXT_CODE_2f291d8b") }}
              </a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_be608c82')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_be608c82") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-select
                v-model:value="options.config.type"
                :placeholder="t('TXT_CODE_3bb646e4')"
                :disabled="isGlobalTerminal"
              >
                <a-select-option
                  v-for="(item, key) in INSTANCE_TYPE_TRANSLATION"
                  :key="key"
                  :value="key"
                >
                  {{ item }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>

          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_fa920c0") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_b029a155')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_b029a155") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-date-picker
                v-model:value="options.dayjsEndTime"
                size="large"
                show-time
                style="width: 100%"
                :placeholder="t('TXT_CODE_e3a77a77')"
                :disabled="isGlobalTerminal"
              />
            </a-form-item>
          </a-col>

          <a-col :xs="24" :offset="0">
            <a-form-item name="startCommand">
              <a-typography-title :level="5">
                {{ t("TXT_CODE_d12fa808") }}
              </a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_A0000001')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span v-html="t('TXT_CODE_A0000001')"></span>
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input-group compact style="display: flex">
                <a-textarea
                  v-model:value="options.config.startCommand"
                  :rows="5"
                  style="min-height: 40px"
                  :placeholder="isDockerMode ? t('TXT_CODE_98e7c829') : t('TXT_CODE_f50cfe2')"
                />
              </a-input-group>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row v-if="activeKey === TabSettings.Advanced" :gutter="20">
          <a-col :xs="24" :offset="0">
            <a-form-item name="cwd">
              <a-typography-title :level="5" class="require-field">
                {{ t("TXT_CODE_ee67e1a3") }}
              </a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_962d9320')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_962d9320") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input v-model:value="options.config.cwd" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_bb0b9711") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="updateCommandDesc" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    <span>{{ t("TXT_CODE_4f387c5a") }}</span>
                    <br />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span v-html="updateCommandDesc"> </span>
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <!-- eslint-disable-next-line vue/html-quotes -->
              <a-input
                v-model:value="options.config.updateCommand"
                :placeholder="UPDATE_CMD_TEMPLATE"
                :disabled="isGlobalTerminal"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="6" :offset="0">
            <a-form-item>
              <a-typography-title :level="5" class="require-field">
                {{ t("TXT_CODE_f041de90") }}
              </a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_6e69b5a5')" placement="top">
                  <a-typography-text
                    type="secondary"
                    :class="[!isPhone && 'two-line-height', 'typography-text-ellipsis']"
                  >
                    {{ t("TXT_CODE_6e69b5a5") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-select
                v-model:value="options.config.fileCode"
                :placeholder="t('TXT_CODE_3bb646e4')"
              >
                <a-select-option v-for="item in TERMINAL_CODE" :key="item" :value="item">
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="16" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_fffaeb17") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip
                  :title="t('TXT_CODE_fffaeb18') + '\n' + t('TXT_CODE_50a2b2d9')"
                  placement="top"
                >
                  <a-typography-text
                    type="secondary"
                    :class="[!isPhone && 'two-line-height', 'typography-text-ellipsis']"
                  >
                    <span>{{ t("TXT_CODE_fffaeb18") }}</span>
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input
                v-model:value="options.config.runAs"
                :placeholder="t('TXT_CODE_9aa83c05')"
                :disabled="isGlobalTerminal"
                style="width: 400px"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row v-if="activeKey === TabSettings.Docker" :gutter="[16, 16]">
          <!-- Protection Status Section Card -->
          <a-col :span="24">
            <div class="protection-section-card" :class="{ active: isDockerMode }">
              <!-- LANDSCAPE LAYOUT: Three horizontal sections -->
              <div class="protection-landscape-row">
                <!-- Left: Icon + Title + Subtitle -->
                <div class="protection-left-section">
                  <span class="protection-icon-wrapper" :class="{ active: isDockerMode }">
                    <safety-outlined v-if="isDockerMode" />
                    <warning-outlined v-else />
                  </span>
                  <div class="protection-text-group">
                    <h3 class="protection-title">Container Protection</h3>
                    <p class="protection-subtitle">
                      {{ isDockerMode ? 'Instance runs in an isolated Docker container' : 'Instance runs directly on host system' }}
                    </p>
                  </div>
                </div>

                <!-- Middle: Status Badges -->
                <div class="protection-middle-section">
                  <div v-if="isDockerMode" class="status-benefits">
                    <span class="benefit-item">✓ File System Isolation</span>
                    <span class="benefit-item">✓ Process Isolation</span>
                    <span class="benefit-item">✓ Resource Limits</span>
                    <span class="benefit-item">~1-3% overhead</span>
                  </div>
                  <div v-else class="status-warnings">
                    <span class="warning-item">⚠ Host filesystem accessible</span>
                    <span class="warning-item">⚠ SSH keys accessible</span>
                    <span class="warning-item">Only for trusted instances!</span>
                  </div>
                </div>

                <!-- Right: Status Tag + Toggle Switch -->
                <div class="protection-right-section">
                  <a-tag :color="isDockerMode ? 'orange' : 'default'" class="status-tag">
                    {{ isDockerMode ? 'ENABLED' : 'DISABLED' }}
                  </a-tag>
                  <a-switch
                    v-model:checked="options.config.processType"
                    :disabled="isGlobalTerminal"
                    checked-value="docker"
                    un-checked-value="general"
                  >
                    <template #checkedChildren><check-outlined /></template>
                    <template #unCheckedChildren><close-outlined /></template>
                  </a-switch>
                </div>
              </div>
            </div>
          </a-col>
          <template v-if="isDockerMode">
            <a-col v-if="options.imageSelectMethod === 'SELECT'" :xs="24" :lg="16" :offset="0">
              <a-form-item :name="['docker', 'image']">
                <a-typography-title :level="5" :class="{ 'require-field': isDockerMode }">
                  {{ t("TXT_CODE_6904cb3") }}
                </a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_ec734b5c')" placement="top">
                    <a-typography-text
                      type="secondary"
                      :class="[!isPhone && 'two-line-height', 'typography-text-ellipsis']"
                    >
                      {{ t("TXT_CODE_ec734b5c") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-select
                  v-model:value="options.config.docker.image"
                  size="large"
                  style="width: 100%"
                  :placeholder="t('TXT_CODE_3bb646e4')"
                  @focus="loadImages"
                  @change="(e, option: DefaultOptionType) => selectImage(option)"
                >
                  <a-select-option
                    v-for="item in dockerImages"
                    :key="item.value"
                    :value="item.value"
                  >
                    {{ item.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>

            <a-col v-if="options.imageSelectMethod === 'EDIT'" :xs="24" :lg="16" :offset="0">
              <a-form-item :name="['docker', 'image']">
                <a-typography-title :level="5" :class="{ 'require-field': isDockerMode }">
                  {{ t("TXT_CODE_4e4d9680") }}
                </a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_4a570d32')" placement="top">
                    <a-typography-text
                      type="secondary"
                      :class="[!isPhone && 'two-line-height', 'typography-text-ellipsis']"
                    >
                      {{ t("TXT_CODE_4a570d32") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input
                  v-model:value="options.config.docker.image"
                  :placeholder="t('TXT_CODE_d7638d7b')"
                />
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item name="changeWorkdir">
                <a-typography-title :level="5" :class="{ 'require-field': isDockerMode }">
                  {{ t("TXT_CODE_5484094a") }}
                </a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_60dd05d5')" placement="top">
                    <a-typography-text
                      type="secondary"
                      :class="[!isPhone && 'two-line-height', 'typography-text-ellipsis']"
                    >
                      {{ t("TXT_CODE_60dd05d5") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-switch
                  v-model:checked="options.config.docker.changeWorkdir"
                  :disabled="isGlobalTerminal"
                  :checked-value="true"
                  :un-checked-value="false"
                >
                  <template #checkedChildren><check-outlined /></template>
                  <template #unCheckedChildren><close-outlined /></template>
                </a-switch>
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="16" :offset="0">
              <a-form-item>
                <a-typography-title :level="5">{{ t("TXT_CODE_81979d0f") }}</a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_c800cb31')" placement="top">
                    <a-typography-text
                      type="secondary"
                      :class="[!isPhone && 'two-line-height', 'typography-text-ellipsis']"
                    >
                      {{ t("TXT_CODE_c800cb31") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input
                  v-model:value="options.config.docker.workingDir"
                  :placeholder="t('TXT_CODE_2082f659')"
                />
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item>
                <a-typography-title :level="5">{{ t("TXT_CODE_d9c73520") }}</a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_828ea87f')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_828ea87f") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input-group compact>
                  <a-button type="default" @click="() => handleEditDockerConfig('volume')">
                    {{ t("TXT_CODE_ad207008") }}
                  </a-button>
                </a-input-group>
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item>
                <a-typography-title :level="5">{{ t("TXT_CODE_cf88c936") }}</a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_1a37f514')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_1a37f514") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input-group compact>
                  <a-button type="default" @click="() => handleEditDockerConfig('port')">
                    {{ t("TXT_CODE_ad207008") }}
                  </a-button>
                </a-input-group>
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item name="basePort">
                <a-typography-title :level="5">
                  {{ t("TXT_CODE_15f5fb07") }}
                </a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_dfd06954')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_dfd06954") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input
                  v-model:value="options.config.basePort"
                  :min="0"
                  :max="65535"
                  :placeholder="t('TXT_CODE_3bb646e4')"
                  :disabled="isGlobalTerminal"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item>
                <a-typography-title :level="5">{{ t("TXT_CODE_b916a8dc") }}</a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_33ce1c5c')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_33ce1c5c") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input-group compact>
                  <a-button type="default" @click="() => handleEditDockerConfig('env')">
                    {{ t("TXT_CODE_ad207008") }}
                  </a-button>
                </a-input-group>
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item :name="['docker', 'networkMode']">
                <a-typography-title :level="5" :class="{ 'require-field': isDockerMode }">
                  {{ t("TXT_CODE_efcef926") }}
                </a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_38a430d8')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_38a430d8") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-select
                  v-model:value="options.config.docker.networkMode"
                  size="large"
                  style="width: 100%"
                  :placeholder="t('TXT_CODE_3bb646e4')"
                  @focus="loadNetworkModes"
                >
                  <a-select-option
                    v-for="item in networkModes"
                    :key="item"
                    :value="item.Name"
                  ></a-select-option>
                </a-select>
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item>
                <a-typography-title :level="5">{{ t("TXT_CODE_10194e6a") }}</a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_97655c5d')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_97655c5d") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-input
                  v-model:value="options.networkAliasesText"
                  :placeholder="t('TXT_CODE_8d4882b0')"
                />
              </a-form-item>
            </a-col>

            <a-col :xs="24" :lg="8" :offset="0">
              <a-form-item>
                <a-typography-title :level="5">{{ t("TXT_CODE_c3a3b6b1") }}</a-typography-title>
                <a-typography-paragraph>
                  <a-tooltip :title="t('TXT_CODE_d1c78fbf')" placement="top">
                    <a-typography-text type="secondary" class="typography-text-ellipsis">
                      {{ t("TXT_CODE_d1c78fbf") }}
                    </a-typography-text>
                  </a-tooltip>
                </a-typography-paragraph>
                <a-tooltip placement="bottom">
                  <template #title>{{ t("TXT_CODE_8d4882b0") }}</template>
                  <a-input
                    v-model:value="options.config.docker.containerName"
                    :placeholder="t('TXT_CODE_f6047384')"
                  />
                </a-tooltip>
              </a-form-item>
            </a-col>
          </template>
        </a-row>
        <a-row v-if="activeKey === TabSettings.ResLimit" :gutter="20">
          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_53046822") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_750ab5c6')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_750ab5c6") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-tooltip placement="bottom">
                <template #title>
                  {{ t("TXT_CODE_dce87e42") }}
                </template>
                <a-input
                  v-model:value="options.config.docker.cpuUsage"
                  :allow-clear="true"
                  :placeholder="t('TXT_CODE_91d857f5')"
                />
              </a-tooltip>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_b0c4e4ae") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_2b9e9b5')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_2b9e9b5") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-tooltip placement="bottom">
                <template #title>
                  {{ t("TXT_CODE_67c765be") }}
                </template>
                <a-input
                  v-model:value="options.config.docker.cpusetCpus"
                  :allow-clear="true"
                  :placeholder="t('TXT_CODE_30fe1717')"
                />
              </a-tooltip>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_6fe24924") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_a0d214ac')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_a0d214ac") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input
                v-model:value="options.config.docker.memory"
                :allow-clear="true"
                :placeholder="t('TXT_CODE_80790069')"
              />
            </a-form-item>
          </a-col>

          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_a68b3a9c") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_b946a322')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_b946a322") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input
                v-model:value="options.config.docker.memorySwap"
                :allow-clear="true"
                :placeholder="t('TXT_CODE_6f1129fb')"
              />
            </a-form-item>
          </a-col>

          <a-col :xs="24" :lg="8" :offset="0">
            <a-form-item>
              <a-typography-title :level="5">{{ t("TXT_CODE_5c43374f") }}</a-typography-title>
              <a-typography-paragraph>
                <a-tooltip :title="t('TXT_CODE_a7885cbc')" placement="top">
                  <a-typography-text type="secondary" class="typography-text-ellipsis">
                    {{ t("TXT_CODE_a7885cbc") }}
                  </a-typography-text>
                </a-tooltip>
              </a-typography-paragraph>
              <a-input
                v-model:value="options.config.docker.memorySwappiness"
                :allow-clear="true"
                :placeholder="t('TXT_CODE_6f1129fb')"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>
  </a-modal>
</template>

<style scoped>
.two-line-height {
}

.typography-text-ellipsis {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* LANDSCAPE Layout - ORANGE GOLD BLACK THEME ONLY */
.protection-section-card {
  background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
  border: 2px solid #2a2a2a;
  border-radius: 12px;
  padding: 24px; /* OCD: 24px all around */
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.protection-section-card.active {
  border-color: #ff8c00; /* ORANGE */
  box-shadow: 0 4px 16px rgba(255, 140, 0, 0.2);
}

.protection-section-card:not(.active) {
  border-color: #666666;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* LANDSCAPE: Three-column horizontal layout */
.protection-landscape-row {
  display: flex;
  align-items: center; /* OCD: All sections vertically centered */
  gap: 24px; /* OCD: 24px between sections */
  justify-content: space-between;
}

/* LEFT Section: Icon + Title + Subtitle */
.protection-left-section {
  display: flex;
  align-items: center; /* OCD: Icon and text aligned */
  gap: 16px; /* OCD: 16px between icon and text */
  flex: 0 0 auto; /* OCD: Don't grow, don't shrink */
  min-width: 280px; /* OCD: Minimum width for title area */
}

.protection-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px; /* OCD: 48x48 perfect square */
  height: 48px;
  border-radius: 8px; /* OCD: 8px radius */
  font-size: 24px;
  transition: all 0.3s ease;
  flex-shrink: 0; /* OCD: Never shrinks */
}

.protection-icon-wrapper.active {
  background: linear-gradient(135deg, #ff8c00 0%, #ffa500 100%); /* ORANGE gradient */
  color: #000000; /* BLACK icon */
  box-shadow: 0 2px 8px rgba(255, 140, 0, 0.3);
}

.protection-icon-wrapper:not(.active) {
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
  color: #999999;
}

.protection-text-group {
  display: flex;
  flex-direction: column;
  gap: 4px; /* OCD: 4px between title and subtitle */
}

.protection-title {
  margin: 0;
  padding: 0;
  font-size: 18px;
  font-weight: 600;
  color: #ffd700; /* GOLD */
  line-height: 1.4;
  white-space: nowrap; /* OCD: No wrapping on desktop */
}

.protection-subtitle {
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: #999999;
  line-height: 1.4;
  white-space: nowrap; /* OCD: No wrapping on desktop */
}

/* MIDDLE Section: Status Badges */
.protection-middle-section {
  flex: 1; /* OCD: Takes remaining space */
  display: flex;
  align-items: center;
  justify-content: center; /* OCD: Badges centered */
  min-width: 0; /* OCD: Allows flex shrinking */
}

.status-benefits,
.status-warnings {
  display: flex;
  flex-wrap: wrap;
  gap: 8px; /* OCD: 8px consistent gap */
  align-items: center;
  justify-content: center; /* OCD: Center badges */
}

.benefit-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px; /* OCD: 6px vertical, 12px horizontal */
  background: linear-gradient(135deg, #ff8c00 0%, #ffa500 100%); /* ORANGE */
  color: #000000; /* BLACK text */
  border-radius: 6px; /* OCD: 6px radius */
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.warning-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px; /* OCD: Same as benefit */
  background: linear-gradient(135deg, #4a4a4a 0%, #3a3a3a 100%);
  color: #ffd700; /* GOLD text */
  border-radius: 6px; /* OCD: 6px radius */
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

/* RIGHT Section: Status Tag + Toggle Switch */
.protection-right-section {
  display: flex;
  align-items: center; /* OCD: Tag and switch horizontally aligned */
  gap: 16px; /* OCD: 16px between tag and switch */
  flex: 0 0 auto; /* OCD: Don't grow, don't shrink */
}

.status-tag {
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0; /* OCD: No default margin */
}

/* RESPONSIVE: Stack vertically on mobile only */
@media (max-width: 992px) {
  .protection-landscape-row {
    flex-direction: column;
    align-items: stretch;
    gap: 16px; /* OCD: Tighter gap on mobile */
  }

  .protection-left-section {
    min-width: 0;
  }

  .protection-title,
  .protection-subtitle {
    white-space: normal; /* Allow wrapping on mobile */
  }

  .protection-middle-section {
    justify-content: flex-start; /* Align left on mobile */
  }

  .status-benefits,
  .status-warnings {
    justify-content: flex-start; /* Align left on mobile */
  }

  .protection-right-section {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
