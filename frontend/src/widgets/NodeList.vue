<script setup lang="ts">
import BetweenMenus from "@/components/BetweenMenus.vue";
import { useScreen } from "@/hooks/useScreen";
import { t } from "@/lang/i18n";
import { reportErrorMsg } from "@/tools/validator";
import type { LayoutCard } from "@/types/index";
import {
  ClusterOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  TableOutlined,
  SortAscendingOutlined,
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
  FileTextOutlined
} from "@ant-design/icons-vue";
import { ref, computed } from "vue";
import { useRemoteNode } from "../hooks/useRemoteNode";
import NodeDetailDialog from "./node/NodeDetailDialog.vue";
import NodeItem from "./node/NodeItem.vue";

defineProps<{
  card: LayoutCard;
}>();

const { isPhone } = useScreen();
const nodeDetailDialog = ref<InstanceType<typeof NodeDetailDialog>>();

const {
  operationForm,
  remoteNodes: remotes,
  refreshLoading,
  currentStatus,
  refresh: refreshOverviewInfo
} = useRemoteNode();

// View mode state
type ViewMode = "grid" | "list" | "compact";
const viewMode = ref<ViewMode>("grid");

// Sort state
type SortBy = "name" | "status" | "cpu" | "memory";
const sortBy = ref<SortBy>("name");
const sortOrder = ref<"asc" | "desc">("asc");

// Filter panel visibility
const showFilters = ref(false);

const refresh = async () => {
  try {
    refreshLoading.value = true;
    await refreshOverviewInfo();
  } catch (error: any) {
    reportErrorMsg(error.message);
  } finally {
    refreshLoading.value = false;
  }
};

const handleOpenDetailDialog = async () => {
  nodeDetailDialog.value?.openDialog();
};

// Grid layout based on view mode
const gridSpan = computed(() => {
  switch (viewMode.value) {
    case "grid":
      return { xs: 24, sm: 24, md: 12, lg: 12, xl: 8 };
    case "list":
      return { xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
    case "compact":
      return { xs: 24, sm: 12, md: 8, lg: 6, xl: 6 };
    default:
      return { xs: 24, sm: 24, md: 12, lg: 12, xl: 12 };
  }
});

// Sort nodes
const sortedRemotes = computed(() => {
  const sorted = [...remotes.value];
  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy.value) {
      case "name":
        comparison = (a.remarks || a.ip).localeCompare(b.remarks || b.ip);
        break;
      case "status":
        comparison = (a.available === b.available) ? 0 : (a.available ? -1 : 1);
        break;
      case "cpu": {
        const cpuA = parseFloat(a.cpuInfo?.match(/([\d.]+)%/)?.[1] || "0");
        const cpuB = parseFloat(b.cpuInfo?.match(/([\d.]+)%/)?.[1] || "0");
        comparison = cpuA - cpuB;
        break;
      }
      case "memory": {
        const memA = parseFloat(a.memText?.match(/([\d.]+)GB/)?.[1] || "0");
        const memB = parseFloat(b.memText?.match(/([\d.]+)GB/)?.[1] || "0");
        comparison = memA - memB;
        break;
      }
    }

    return sortOrder.value === "asc" ? comparison : -comparison;
  });

  return sorted;
});

const toggleSort = (newSortBy: SortBy) => {
  if (sortBy.value === newSortBy) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortBy.value = newSortBy;
    sortOrder.value = "asc";
  }
};
</script>

<template>
  <div style="height: 100%" class="node-list-container">
    <a-row :gutter="[12, 12]" style="height: 100%">
      <!-- Header Section -->
      <a-col :span="24">
        <BetweenMenus>
          <template v-if="!isPhone" #left>
            <a-typography-title class="mb-0 page-title" :level="4">
              <ClusterOutlined style="color: #FF8C42" />
              {{ card.title }}
            </a-typography-title>
          </template>
          <template #right>
            <a-button
              class="action-btn"
              :disabled="refreshLoading"
              :loading="refreshLoading"
              @click="refresh"
            >
              <ReloadOutlined />
              {{ t("TXT_CODE_b76d94e0") }}
            </a-button>
            <a-button class="action-btn primary-btn" type="primary" @click="handleOpenDetailDialog">
              <PlusOutlined />
              {{ t("TXT_CODE_15a381d5") }}
            </a-button>
            <a-button class="action-btn" href="https://docs.mcsmanager.com/" target="_black">
              <FileTextOutlined />
              {{ t("TXT_CODE_3a302f23") }}
            </a-button>
          </template>
          <template #center>
            <div class="search-input">
              <a-input-group compact>
                <a-select
                  v-model:value="currentStatus"
                  class="status-filter"
                  style="width: 100px"
                >
                  <a-select-option value="all">
                    {{ t("TXT_CODE_c48f6f64") }}
                  </a-select-option>
                  <a-select-option :value="true">
                    {{ t("TXT_CODE_823bfe63") }}
                  </a-select-option>
                  <a-select-option :value="false">
                    {{ t("TXT_CODE_66ce073e") }}
                  </a-select-option>
                </a-select>
                <a-input
                  v-model:value.trim="operationForm.name"
                  :placeholder="t('TXT_CODE_461d1a01')"
                  class="search-field"
                  style="width: calc(100% - 100px)"
                  @change="operationForm.current = 1"
                >
                  <template #prefix>
                    <SearchOutlined style="color: #FF8C42" />
                  </template>
                </a-input>
              </a-input-group>
            </div>
          </template>
        </BetweenMenus>
      </a-col>

      <!-- Controls Bar -->
      <a-col :span="24">
        <div class="controls-bar">
          <div class="left-controls">
            <a-typography-text type="secondary" class="info-text">
              {{ t("TXT_CODE_f9a92e38") }}
            </a-typography-text>
          </div>

          <div class="center-controls">
            <!-- Sort Options -->
            <a-button-group class="sort-group">
              <a-tooltip title="Sort by Name">
                <a-button
                  :type="sortBy === 'name' ? 'primary' : 'default'"
                  @click="toggleSort('name')"
                >
                  Name
                  <SortAscendingOutlined
                    :style="{ transform: sortBy === 'name' && sortOrder === 'desc' ? 'rotate(180deg)' : 'none' }"
                  />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Sort by Status">
                <a-button
                  :type="sortBy === 'status' ? 'primary' : 'default'"
                  @click="toggleSort('status')"
                >
                  Status
                </a-button>
              </a-tooltip>
              <a-tooltip title="Sort by CPU">
                <a-button
                  :type="sortBy === 'cpu' ? 'primary' : 'default'"
                  @click="toggleSort('cpu')"
                >
                  CPU
                </a-button>
              </a-tooltip>
              <a-tooltip title="Sort by Memory">
                <a-button
                  :type="sortBy === 'memory' ? 'primary' : 'default'"
                  @click="toggleSort('memory')"
                >
                  Memory
                </a-button>
              </a-tooltip>
            </a-button-group>
          </div>

          <div class="right-controls">
            <!-- View Mode Toggle -->
            <a-button-group class="view-toggle">
              <a-tooltip title="Grid View">
                <a-button
                  :type="viewMode === 'grid' ? 'primary' : 'default'"
                  @click="viewMode = 'grid'"
                >
                  <AppstoreOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip title="List View">
                <a-button
                  :type="viewMode === 'list' ? 'primary' : 'default'"
                  @click="viewMode = 'list'"
                >
                  <UnorderedListOutlined />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Compact View">
                <a-button
                  :type="viewMode === 'compact' ? 'primary' : 'default'"
                  @click="viewMode = 'compact'"
                >
                  <TableOutlined />
                </a-button>
              </a-tooltip>
            </a-button-group>

            <!-- Pagination -->
            <a-pagination
              v-model:current="operationForm.current"
              :total="operationForm.total"
              :page-size="operationForm.pageSize"
              :show-size-changer="!isPhone"
              size="small"
              @show-size-change="(current, size) => (operationForm.pageSize = size)"
            />
          </div>
        </div>
      </a-col>

      <!-- Node Grid -->
      <fade-up-animation v-if="!refreshLoading" :delay="3000">
        <a-col
          v-for="item in sortedRemotes"
          :key="item.uuid + item.available + item.ip"
          v-bind="gridSpan"
        >
          <NodeItem :item="item" :class="'node-' + viewMode"></NodeItem>
        </a-col>
      </fade-up-animation>
    </a-row>
  </div>
  <NodeDetailDialog ref="nodeDetailDialog"></NodeDetailDialog>
</template>

<style lang="scss" scoped>
.node-list-container {
  padding: 16px;
}

.page-title {
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.action-btn {
  transition: all 0.2s ease;
  border-radius: 6px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.2);
  }

  &.primary-btn {
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    border: none;

    &:hover {
      background: linear-gradient(135deg, #ff9d5c, #dfc051);
    }
  }
}

.search-input {
  transition: all 0.4s;
  text-align: center;
  width: 80%;

  &:hover {
    width: 100%;
  }

  .status-filter {
    border-radius: 6px 0 0 6px;
  }

  .search-field {
    border-radius: 0 6px 6px 0;

    &:focus {
      border-color: #FF8C42;
      box-shadow: 0 0 0 2px rgba(255, 140, 66, 0.1);
    }
  }
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.03), rgba(212, 175, 55, 0.03));
  border-radius: 8px;
  border: 1px solid rgba(255, 140, 66, 0.1);
  flex-wrap: wrap;
}

.left-controls {
  flex: 1;
  min-width: 200px;

  .info-text {
    font-size: 13px;
  }
}

.center-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.right-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.sort-group {
  :deep(.ant-btn-primary) {
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    border: none;

    &:hover {
      background: linear-gradient(135deg, #ff9d5c, #dfc051);
    }
  }

  button {
    transition: all 0.2s ease;
    font-size: 12px;
    padding: 4px 12px;
    height: 32px;

    &:hover {
      border-color: #FF8C42;
      color: #FF8C42;
    }
  }
}

.view-toggle {
  :deep(.ant-btn-primary) {
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    border: none;

    &:hover {
      background: linear-gradient(135deg, #ff9d5c, #dfc051);
    }
  }

  button {
    transition: all 0.2s ease;
    font-size: 16px;
    width: 36px;
    height: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      border-color: #FF8C42;
      color: #FF8C42;
    }
  }
}

// View mode specific styles
:deep(.node-compact) {
  .modern-node-card {
    .resources-section,
    .chart-section {
      display: none;
    }

    .stats-grid {
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .stat-item {
      padding: 6px;
    }
  }
}

:deep(.node-list) {
  .modern-node-card {
    .chart-section {
      display: none;
    }
  }
}

@media (max-width: 1200px) {
  .controls-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .left-controls,
  .center-controls,
  .right-controls {
    width: 100%;
    justify-content: center;
  }

  .center-controls {
    flex-wrap: wrap;
  }
}

@media (max-width: 992px) {
  .search-input {
    width: 100% !important;
  }

  .sort-group {
    button {
      font-size: 11px;
      padding: 4px 8px;
    }
  }
}

@media (max-width: 768px) {
  .node-list-container {
    padding: 12px;
  }

  .controls-bar {
    padding: 8px;
  }

  .sort-group,
  .view-toggle {
    button {
      font-size: 11px;
      padding: 4px 6px;
    }
  }

  .right-controls {
    :deep(.ant-pagination) {
      .ant-pagination-options {
        display: none;
      }
    }
  }
}
</style>
