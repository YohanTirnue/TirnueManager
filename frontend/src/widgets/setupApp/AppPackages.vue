<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import FadeUpAnimation from "@/components/FadeUpAnimation.vue";
import Loading from "@/components/Loading.vue";
import { getCurrentLang, isCN, t } from "@/lang/i18n";
import { quickInstallListAddr } from "@/services/apis/instance";
import { reportErrorMsg } from "@/tools/validator";
import type { QuickStartPackages } from "@/types";
import { DatabaseOutlined, DownloadOutlined } from "@ant-design/icons-vue";
import { Flex, Modal } from "ant-design-vue";
import Link from "ant-design-vue/es/typography/Link";
import { computed, onMounted, reactive, ref } from "vue";

const props = defineProps<{
  title?: string;
  btnText?: string;
  showCustomBtn?: boolean;
  onlyDockerTemplate?: boolean;
}>();

const emit = defineEmits<{
  "handle-select-template": [item: QuickStartPackages | null];
}>();

const {
  state: presetList,
  execute: getQuickInstallListAddr,
  isLoading: appListLoading
} = quickInstallListAddr();

const SEARCH_ALL_KEY = "ALL";

// Pagination state for better performance
const currentPage = ref(1);
const pageSize = ref(24); // Show 24 items per page

// Search form state for filtering packages
// Contains language, category, game type, and platform filters with default values
const searchForm = reactive({
  language: isCN() ? getCurrentLang() : "en_us",
  category: SEARCH_ALL_KEY,
  gameType: SEARCH_ALL_KEY,
  platform: SEARCH_ALL_KEY
});

// Type definition for filter options used in select dropdowns
interface FilterOption {
  label: string;
  value: string;
}

// Generic filter condition checker function
// Checks if an item matches a specific field filter value
// Returns true if filterValue is "ALL" (no filter) or if item field matches filterValue
const matchesFilterCondition = (
  item: QuickStartPackages,
  field: keyof QuickStartPackages,
  filterValue: string
): boolean => {
  return filterValue === SEARCH_ALL_KEY || item[field] === filterValue;
};

// Language filter function - checks if item matches current language filter
const matchesLanguageFilter = (item: QuickStartPackages): boolean => {
  return matchesFilterCondition(item, "language", searchForm.language);
};

// Game type filter function - checks if item matches current game type filter
const matchesGameTypeFilter = (item: QuickStartPackages): boolean => {
  return matchesFilterCondition(item, "gameType", searchForm.gameType);
};

// Category filter function - checks if item matches current category filter
const matchesCategoryFilter = (item: QuickStartPackages): boolean => {
  return matchesFilterCondition(item, "category", searchForm.category);
};

// Platform filter function - checks if item matches current platform filter
const matchesPlatformFilter = (item: QuickStartPackages): boolean => {
  return matchesFilterCondition(item, "platform", searchForm.platform);
};

// Get filtered packages based on current search criteria
// Supports additional custom filters through additionalFilters parameter
// Returns empty array if no packages are available
const getFilteredPackages = (
  // eslint-disable-next-line no-unused-vars
  additionalFilters?: (item: QuickStartPackages) => boolean
): QuickStartPackages[] => {
  if (!presetList.value?.packages) {
    return [];
  }

  return presetList.value.packages.filter((item) => {
    if (props.onlyDockerTemplate && !item.setupInfo?.docker) {
      return false;
    }

    // Apply base filters (language, game type, category, platform)
    const baseFilters = [
      matchesLanguageFilter(item),
      matchesGameTypeFilter(item),
      matchesCategoryFilter(item),
      matchesPlatformFilter(item)
    ];

    // Combine base filters with additional custom filters if provided
    const allFilters = additionalFilters ? [additionalFilters(item)] : baseFilters;
    return allFilters.every((filter) => filter);
  });
};

const getSummaryPackages = (
  // eslint-disable-next-line no-unused-vars
  additionalFilters?: (item: QuickStartPackages) => boolean
): QuickStartPackages[] => {
  let filteredPackages = getFilteredPackages(additionalFilters);
  if (searchForm.gameType == SEARCH_ALL_KEY) {
    const map = new Map<string, QuickStartPackages>();
    filteredPackages.forEach((item) => {
      if (!map.has(item.gameType)) {
        const summary: QuickStartPackages = {
          ...item,
          description: "",
          title: item.gameType,
          category: "",
          runtime: "",
          size: "",
          hardware: "",
          remark: "",
          targetLink: undefined,
          author: "",
          setupInfo: undefined,
          tags: undefined,
          isSummary: true
        };
        map.set(item.gameType, summary);
      } else {
        const existing = map.get(item.gameType);
        if (existing) {
          if (existing.platform != item.platform) {
            existing.platform = "All";
          }
        }
      }
    });
    filteredPackages = Array.from(map.values());
  }
  return filteredPackages;
};

// Generic function to generate options list for select dropdowns
// Creates unique options from package items based on specified field
// Supports additional filtering before generating options
const generateOptionsList = (
  items: QuickStartPackages[],
  field: keyof QuickStartPackages,
  allLabel: string,
  // eslint-disable-next-line no-unused-vars
  additionalFilter?: (item: QuickStartPackages) => boolean
): FilterOption[] => {
  const valueMap: Record<string, string> = {};

  // Apply additional filter if provided, otherwise use all items
  const filteredItems = additionalFilter ? items.filter(additionalFilter) : items;

  // Build unique value map from filtered items
  filteredItems.forEach((item) => {
    const value = item[field] as string;
    if (!valueMap[value]) {
      valueMap[value] = value;
    }
  });

  // Add "ALL" option to the map
  valueMap[SEARCH_ALL_KEY] = allLabel;

  // Convert map to array of FilterOption objects
  return Object.keys(valueMap).map((key) => ({
    label: valueMap[key],
    value: key
  }));
};

// Computed property for all filtered packages (without pagination)
const allFilteredPackages = computed(() => {
  return getSummaryPackages();
});

// Computed property for paginated application list
// Uses pagination for better performance
const appList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return allFilteredPackages.value.slice(start, end);
});

// Total count for pagination
const totalPackages = computed(() => allFilteredPackages.value.length);

// Computed property for language options dropdown
// Includes "ALL" option and available languages from preset data
const appLangList = computed(() => {
  const languageOptions: FilterOption[] =
    presetList.value?.languages instanceof Array ? presetList.value.languages : [];

  return [...languageOptions];
});

// Computed property for game type options dropdown
// Filters packages by current language selection before generating options
const appGameTypeList = computed(() => {
  const packages = getFilteredPackages(matchesLanguageFilter);
  return generateOptionsList(packages, "gameType", t("TXT_CODE_107695d"));
});

// Computed property for category options dropdown
// Filters packages by current language and game type selections before generating options
const appCategoryList = computed(() => {
  const packages = getFilteredPackages(
    (item) => matchesLanguageFilter(item) && matchesGameTypeFilter(item)
  );
  return generateOptionsList(packages, "category", t("TXT_CODE_2af87548"));
});

// Computed property for platform options dropdown
// Filters packages by current language, game type, and category selections before generating options
const appPlatformList = computed(() => {
  const packages = getFilteredPackages(
    (item) => matchesLanguageFilter(item) && matchesGameTypeFilter(item)
  );
  return generateOptionsList(packages, "platform", t("TXT_CODE_47203b64"));
});

// Initialize function to load package data and handle errors
// Fetches quick install list and shows error modal if no packages are available
const init = async () => {
  try {
    const list = await getQuickInstallListAddr();
    if (!list.value?.packages || list.value?.packages.length === 0) {
      Modal.error({
        title: t("TXT_CODE_c534ca49"),
        content: t("TXT_CODE_bcfaf14d")
      });
    }
  } catch (err: any) {
    console.error(err.message);
    return reportErrorMsg(err.message);
  }
};

const handleReset = () => {
  searchForm.language = isCN() ? getCurrentLang() : "en_us";
  searchForm.gameType = SEARCH_ALL_KEY;
  searchForm.category = SEARCH_ALL_KEY;
  searchForm.platform = SEARCH_ALL_KEY;
  currentPage.value = 1; // Reset to first page
};

const handleGameTypeChange = () => {
  searchForm.category = SEARCH_ALL_KEY;
  searchForm.platform = SEARCH_ALL_KEY;
  currentPage.value = 1; // Reset to first page
};

const handleLanguageChange = () => {
  searchForm.gameType = SEARCH_ALL_KEY;
  searchForm.category = SEARCH_ALL_KEY;
  searchForm.platform = SEARCH_ALL_KEY;
  currentPage.value = 1; // Reset to first page
};

const handlePlatformChange = () => {
  searchForm.category = SEARCH_ALL_KEY;
  currentPage.value = 1; // Reset to first page
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  // Scroll to top when page changes
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleSelectTopCategory = (item: QuickStartPackages) => {
  searchForm.gameType = item.gameType;
};

defineExpose({
  init,
  appList
});

onMounted(() => {
  init();
});
</script>

<template>
  <a-typography-title :level="4" style="margin-bottom: 8px">
    <DatabaseOutlined />
    {{ title || t("TXT_CODE_88249aee") }}
  </a-typography-title>
  <a-typography-paragraph>
    <Flex justify="space-between" align="flex-start">
      <p>
        <span>{{ t("TXT_CODE_c9ce7427") }}</span>
        <span v-if="onlyDockerTemplate">
          <br />
          {{ t("TXT_CODE_de9b7cc0") }}
          <br />
        </span>
      </p>
      <p>
        <Link href="https://github.com/MCSManager/Script/issues/77" target="_blank">
          {{ t("TXT_CODE_709c2db4") }}
        </Link>
      </p>
    </Flex>
  </a-typography-paragraph>
  <!-- Loading state - shows loading spinner while fetching package data -->
  <a-row v-if="appListLoading" :gutter="[24, 24]" style="height: 100%">
    <a-col :span="24">
      <div
        style="
          height: 50vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        "
      >
        <div>
          <Loading />
        </div>
        <div style="margin-top: 20px; color: var(--color-gray-12)">
          {{ t("TXT_CODE_7fca723a") }}
        </div>
      </div>
    </a-col>
  </a-row>

  <!-- Main content - package marketplace interface -->
  <a-row v-else :gutter="[16, 16]" style="height: 100%">
    <!-- Search filters section -->
    <a-col :span="24" :md="24">
      <a-form
        layout="horizontal"
        :model="searchForm"
        style="display: flex; gap: 10px; flex-wrap: wrap"
      >
        <!-- Language filter dropdown -->
        <a-form-item class="mb-0">
          <a-select
            v-model:value="searchForm.language"
            style="width: 200px"
            :placeholder="t('TXT_CODE_8a30e150')"
            @change="handleLanguageChange"
          >
            <a-select-option v-for="item in appLangList" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- Game type filter dropdown -->
        <a-form-item class="mb-0">
          <a-select
            v-model:value="searchForm.gameType"
            style="width: 200px"
            :placeholder="t('TXT_CODE_107695d')"
            @change="handleGameTypeChange"
          >
            <a-select-option v-for="item in appGameTypeList" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- Platform filter dropdown -->
        <a-form-item class="mb-0">
          <a-select
            v-model:value="searchForm.platform"
            style="width: 200px"
            :placeholder="t('TXT_CODE_47203b64')"
            @change="handlePlatformChange"
          >
            <a-select-option v-for="item in appPlatformList" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- Category filter dropdown -->
        <a-form-item class="mb-0">
          <a-select
            v-model:value="searchForm.category"
            style="width: 200px"
            :placeholder="t('TXT_CODE_ebbb2def')"
          >
            <a-select-option v-for="item in appCategoryList" :key="item.value" :value="item.value">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item class="mb-0">
          <a-button type="default" @click="handleReset">
            {{ t("TXT_CODE_880fedf7") }}
          </a-button>
        </a-form-item>
      </a-form>
    </a-col>

    <a-col v-if="showCustomBtn" :span="24" :md="24" class="justify-end">
      <a-button
        type="link"
        style="margin: 0; padding: 0"
        @click="emit('handle-select-template', null)"
      >
        {{ t("TXT_CODE_181c72ba") }}
      </a-button>
    </a-col>

    <!-- Empty state - shown when no packages match current filters -->
    <a-col v-if="allFilteredPackages.length === 0" :span="24">
      <div style="display: flex; justify-content: center; align-items: center; height: 40vh">
        <a-typography-paragraph :style="{ color: 'var(--color-gray-7)' }">
          {{ t("TXT_CODE_7356e569") }}
        </a-typography-paragraph>
      </div>
    </a-col>

    <!-- Package cards grid with fade-up animation -->
    <fade-up-animation>
      <a-col
        v-for="item in appList"
        :key="item.targetLink + item.title + item.gameType + item.language + item.category"
        :span="24"
        :xl="item.isSummary ? 8 : 6"
        :lg="item.isSummary ? 8 : 6"
        :sm="24"
      >
        <div style="display: flex; flex-grow: 1; flex-direction: column; height: 100%">
          <!-- Top Category Card -->
          <div
            v-if="item.isSummary"
            class="package-image-container-summary global-card-container-shadow"
            style="overflow: hidden"
            @click="handleSelectTopCategory(item)"
          >
            <div class="package-image-container" style="border-radius: 0">
              <img
                class="package-image cursor-pointer"
                style="height: 220px; border-radius: 0"
                :src="item.image"
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>

            <a-typography-title :level="5" class="flex-center package-subtitle">
              <span>
                {{ item.title }}
              </span>
            </a-typography-title>
          </div>

          <!-- Template Pack -->
          <CardPanel v-else style="flex-grow: 1" :style="{ padding: '12px' }">
            <!-- Package content -->
            <template #body>
              <div class="package-card-content">
                <div class="package-image-container">
                  <img class="package-image cursor-pointer" :src="item.image" alt="" loading="lazy" decoding="async" />
                </div>

                <div class="package-info">
                  <a-typography-title :level="5" class="justify-between">
                    <span>
                      {{ item.title }}
                    </span>
                    <span>
                      <a-tag v-if="item.platform" color="cyan">
                        {{
                          String(item.platform).toLowerCase() === "all"
                            ? t("TXT_CODE_all_platform")
                            : item.platform
                        }}
                      </a-tag>
                    </span>
                  </a-typography-title>
                  <div class="mb-5">
                    <a-tag v-for="tag in item.tags" :key="tag" color="blue">{{ tag }}</a-tag>
                  </div>
                  <a-typography-paragraph>
                    <a-typography-text :style="{ fontSize: '12px' }">
                      <p>
                        <span>
                          {{ item.description || "&nbsp;" }}
                        </span>
                      </p>
                      <p v-if="item.runtime">
                        <span style="opacity: 0.6">{{ t("TXT_CODE_18b94497") }}: </span>
                        <span>{{ item.runtime }}</span>
                      </p>
                      <p v-if="item.hardware">
                        <span style="opacity: 0.6">{{ t("TXT_CODE_683e3033") }}: </span>
                        <span>{{ item.hardware }}</span>
                      </p>
                    </a-typography-text>
                  </a-typography-paragraph>
                </div>

                <div class="package-action">
                  <a-button
                    block
                    type="primary"
                    class="download-button"
                    @click="emit('handle-select-template', item)"
                  >
                    <template #icon>
                      <DownloadOutlined />
                    </template>
                    {{ btnText || t("TXT_CODE_1704ea49") }}
                  </a-button>
                </div>
              </div>
            </template>
          </CardPanel>
        </div>
      </a-col>
    </fade-up-animation>

    <!-- Pagination -->
    <a-col v-if="totalPackages > pageSize" :span="24" style="margin-top: 24px">
      <div style="display: flex; justify-content: center">
        <a-pagination
          v-model:current="currentPage"
          :total="totalPackages"
          :page-size="pageSize"
          :show-size-changer="false"
          :show-total="(total: number) => `Total ${total} templates`"
          @change="handlePageChange"
        />
      </div>
    </a-col>
  </a-row>
</template>

<style scoped lang="scss">
// Modern Marketplace with Gold/Orange Theme
.package-card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: space-between;
  height: 100%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;

  &:hover {
    transform: translateY(-2px);
  }
}

.package-image-container {
  overflow: hidden;
  border-radius: 12px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.15);
  }

  // Removed ::after pseudo-element for better performance
}

.cursor-pointer {
  cursor: pointer;
}

.package-image {
  height: 100%;
  width: 100%;
  object-fit: cover;
  height: 200px; // Increased from 160px for better visibility
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.05), rgba(212, 175, 55, 0.05));
  user-drag: none;
  user-select: none;
  will-change: transform;

  &:hover {
    transform: scale(1.05);
    // Removed heavy filters (brightness/saturate) for performance
  }
}

.package-info {
  flex: 1;

  .ant-typography-title {
    margin-bottom: 12px !important;

    span:first-child {
      background: linear-gradient(135deg, #FF8C42, #D4AF37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
      font-size: 17px;
    }
  }

  .ant-tag {
    border-radius: 8px;
    font-weight: 500;
    padding: 4px 12px;
    border: none;
    background: linear-gradient(135deg, rgba(255, 171, 0, 0.15), rgba(230, 81, 0, 0.15));
    color: #E65100;

    &[color="cyan"] {
      background: linear-gradient(135deg, rgba(255, 140, 66, 0.2), rgba(212, 175, 55, 0.2));
      color: #D4AF37;
      border: 1px solid rgba(212, 175, 55, 0.3);
    }

    &[color="blue"] {
      background: linear-gradient(135deg, rgba(255, 140, 66, 0.15), rgba(212, 175, 55, 0.15));
      color: #FF6B35;
      border: 1px solid rgba(255, 140, 66, 0.3);
    }
  }
}

.package-action {
  display: flex;
  justify-content: center;
  margin-top: auto;
}

.download-button {
  margin: 0px auto;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
  min-width: 140px;
  height: 40px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
  will-change: transform;

  &:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 6px 20px rgba(255, 140, 66, 0.4);
    // Removed gradient change on hover for better performance
  }

  &:active {
    transform: translateY(0) scale(1);
  }
}

// Removed infinite animation on hover for better performance
// .ant-card:hover .download-button {
//   animation: pulse-glow-gold 2s infinite;
// }

.package-subtitle {
  cursor: pointer;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.95), rgba(212, 175, 55, 0.95));
  backdrop-filter: blur(8px);
  color: rgb(255, 255, 255);
  padding: 12px 8px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 0 !important;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  text-align: center;
  z-index: 1;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  will-change: transform;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    // Removed gradient and padding changes for better performance
  }
}

.package-image-container-summary {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.2);
  will-change: transform;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(255, 140, 66, 0.3);
  }

  .package-image-container {
    border-radius: 0;

    .package-image {
      height: 240px; // Larger for category cards
    }
  }
}

// Modern filter styling
:deep(.ant-select) {
  .ant-select-selector {
    border-radius: 10px !important;
    border: 2px solid transparent !important;
    transition: all 0.2s ease !important;

    &:hover {
      border-color: rgba(255, 140, 66, 0.3) !important;
    }
  }

  &.ant-select-focused .ant-select-selector {
    border-color: #FF8C42 !important;
    box-shadow: 0 0 0 2px rgba(255, 140, 66, 0.1) !important;
  }
}

:deep(.ant-btn) {
  border-radius: 10px;
  font-weight: 500;

  &[type="default"] {
    border: 2px solid rgba(255, 140, 66, 0.3);
    color: #FF8C42;
    transition: all 0.2s ease;

    &:hover {
      border-color: #FF8C42;
      color: #FF6B35;
      background: rgba(255, 140, 66, 0.05);
    }
  }
}

@keyframes pulse-glow-gold {
  0%,
  100% {
    box-shadow:
      0 6px 20px rgba(255, 140, 66, 0.4),
      0 0 15px rgba(255, 140, 66, 0.2);
  }
  50% {
    box-shadow:
      0 8px 30px rgba(255, 140, 66, 0.6),
      0 0 25px rgba(255, 140, 66, 0.4);
  }
}
</style>
