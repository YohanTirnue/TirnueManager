<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { DatabaseOutlined, SearchOutlined, FireOutlined, RocketOutlined, StarOutlined, PlusCircleOutlined } from "@ant-design/icons-vue";
import { Modal } from "ant-design-vue";
import CardPanel from "@/components/CardPanel.vue";
import Loading from "@/components/Loading.vue";
import CreateInstanceModal from "@/widgets/setupApp/CreateInstanceModal.vue";
import CreateInstanceForm from "@/widgets/setupApp/CreateInstanceForm.vue";
import { router } from "@/config/router";
import { getCurrentLang, isCN, t } from "@/lang/i18n";
import { quickInstallListAddr } from "@/services/apis/instance";
import { reportErrorMsg } from "@/tools/validator";
import { QUICKSTART_ACTION_TYPE, QUICKSTART_METHOD } from "@/hooks/widgets/quickStartFlow";
import type { QuickStartPackages } from "@/types";

const props = defineProps<{
  title?: string;
  btnText?: string;
  showCustomBtn?: boolean;
  onlyDockerTemplate?: boolean;
  hideCreateButton?: boolean;
}>();

const emit = defineEmits<{
  "handle-select-template": [item: QuickStartPackages | null];
}>();

const {
  state: presetList,
  execute: getQuickInstallListAddr,
  isLoading: appListLoading
} = quickInstallListAddr();

// State
const searchQuery = ref("");
const showCreateModal = ref(false);
const showCreateForm = ref(false);
const selectedCategory = ref<string>("all");
const currentPage = ref(1);
const pageSize = ref(12); // 2 rows of 6 - faster loading
const viewMode = ref<"grid" | "list">("grid");

// Creation form data
const formData = ref({
  appType: QUICKSTART_ACTION_TYPE.AnyApp,
  createMethod: QUICKSTART_METHOD.DOCKER,
  daemonId: ""
});

// Handle create option selected from modal
const handleCreateInstance = (data: { createMethod: QUICKSTART_METHOD; appType: QUICKSTART_ACTION_TYPE; daemonId: string }) => {
  formData.value = data;
  showCreateForm.value = true;
};

// Handle instance created successfully
const handleNext = (instanceUuid: string) => {
  showCreateForm.value = false;
  // Navigate to instance terminal
  router.push({
    path: "/instances/terminal",
    query: {
      daemonId: formData.value.daemonId,
      instanceId: instanceUuid
    }
  });
};

// Get all available categories from templates
const categories = computed(() => {
  if (!presetList.value?.packages) return [];

  const cats = new Set<string>();
  presetList.value.packages.forEach(pkg => {
    if (pkg.gameType) cats.add(pkg.gameType);
  });

  return Array.from(cats).sort();
});

// Featured templates (first 3)
const featuredTemplates = computed(() => {
  if (!presetList.value?.packages) return [];
  return presetList.value.packages.slice(0, 3);
});

// Filter packages based on search and category
const filteredPackages = computed(() => {
  if (!presetList.value?.packages) return [];

  let filtered = presetList.value.packages.filter(item => {
    // Docker filter
    if (props.onlyDockerTemplate && !item.setupInfo?.docker) {
      return false;
    }

    // Category filter
    if (selectedCategory.value !== "all" && item.gameType !== selectedCategory.value) {
      return false;
    }

    // Search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      const matchesTitle = item.title?.toLowerCase().includes(query);
      const matchesDescription = item.description?.toLowerCase().includes(query);
      const matchesTags = item.tags?.some(tag => tag.toLowerCase().includes(query));
      const matchesGameType = item.gameType?.toLowerCase().includes(query);

      return matchesTitle || matchesDescription || matchesTags || matchesGameType;
    }

    return true;
  });

  return filtered;
});

// Paginated packages
const paginatedPackages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredPackages.value.slice(start, end);
});

const totalPackages = computed(() => filteredPackages.value.length);

// Initialize
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

// Debounced search for better performance
let searchTimeout: number | null = null;
const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(() => {
    currentPage.value = 1;
  }, 300);
};

const handleCategoryChange = (category: string) => {
  selectedCategory.value = category;
  currentPage.value = 1;
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleReset = () => {
  searchQuery.value = "";
  selectedCategory.value = "all";
  currentPage.value = 1;
};

defineExpose({ init });

onMounted(() => {
  init();
});
</script>

<template>
  <div class="modern-marketplace">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-icon">
          <RocketOutlined />
        </div>
        <h1 class="hero-title">Template Marketplace</h1>
        <p class="hero-subtitle">Browse and install game servers, bots, and applications instantly</p>
        <a-button
          v-if="!props.hideCreateButton"
          type="primary"
          size="large"
          class="create-instance-btn"
          @click="showCreateModal = true"
        >
          <template #icon><PlusCircleOutlined /></template>
          Create Instance
        </a-button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-container">
      <a-input-search
        v-model:value="searchQuery"
        size="large"
        placeholder="Search: Minecraft, Velocity, Folia, Geyser, Purpur, Paper..."
        class="modern-search"
        allow-clear
        @search="handleSearch"
        @change="handleSearch"
      >
        <template #prefix>
          <SearchOutlined class="search-icon" />
        </template>
      </a-input-search>

      <div v-if="!appListLoading" class="template-count">
        Found {{ filteredPackages.length }} templates
      </div>
    </div>

    <!-- Category Pills -->
    <div class="category-pills">
      <div
        class="category-pill"
        :class="{ active: selectedCategory === 'all' }"
        @click="handleCategoryChange('all')"
      >
        <FireOutlined /> All Templates
      </div>
      <div
        v-for="cat in categories"
        :key="cat"
        class="category-pill"
        :class="{ active: selectedCategory === cat }"
        @click="handleCategoryChange(cat)"
      >
        {{ cat }}
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="appListLoading" class="loading-container">
      <Loading />
      <p>Loading templates...</p>
    </div>

    <!-- Featured Templates (only show when no filters) -->
    <div v-else-if="searchQuery === '' && selectedCategory === 'all'" class="featured-section">
      <h2 class="section-title">
        <StarOutlined /> Featured Templates
      </h2>
      <div class="featured-grid">
        <div
          v-for="item in featuredTemplates"
          :key="item.targetLink"
          class="featured-card"
          @click="emit('handle-select-template', item)"
        >
          <div class="featured-image">
            <img :src="item.image" :alt="item.title" loading="lazy" />
            <div class="featured-overlay">
              <div class="featured-badge">Featured</div>
            </div>
          </div>
          <div class="featured-info">
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <div class="featured-tags">
              <span v-for="tag in item.tags?.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Grid -->
    <div v-if="!appListLoading" class="templates-section">
      <div class="section-header">
        <h2 class="section-title">
          <DatabaseOutlined /> All Templates ({{ totalPackages }})
        </h2>
        <a-button v-if="searchQuery || selectedCategory !== 'all'" @click="handleReset">
          Reset Filters
        </a-button>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPackages.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No templates found</h3>
        <p>Try adjusting your search or filters</p>
        <a-button type="primary" @click="handleReset">Clear Filters</a-button>
      </div>

      <!-- Template Cards -->
      <div v-else class="template-grid">
        <div
          v-for="item in paginatedPackages"
          :key="item.targetLink + item.title"
          class="template-card"
        >
          <div class="template-image">
            <img :src="item.image" :alt="item.title" loading="lazy" decoding="async" />
            <div class="template-platform">{{ item.platform || 'All' }}</div>
          </div>

          <div class="template-content">
            <h3 class="template-title">{{ item.title }}</h3>

            <div class="template-tags">
              <span v-for="tag in item.tags?.slice(0, 3)" :key="tag" class="tag">
                {{ tag }}
              </span>
            </div>

            <p class="template-description">{{ item.description || 'No description available' }}</p>

            <div class="template-meta">
              <span v-if="item.runtime">⚡ {{ item.runtime }}</span>
              <span v-if="item.hardware">💻 {{ item.hardware }}</span>
            </div>
          </div>

          <div class="template-footer">
            <a-button
              type="primary"
              block
              class="install-btn"
              @click="emit('handle-select-template', item)"
            >
              <template #icon>⚡</template>
              Install Now
            </a-button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPackages > pageSize" class="pagination-container">
        <a-pagination
          v-model:current="currentPage"
          :total="totalPackages"
          :page-size="pageSize"
          :show-size-changer="false"
          show-quick-jumper
          @change="handlePageChange"
        >
          <template #itemRender="{ type, originalElement }">
            <a v-if="type === 'prev'">← Previous</a>
            <a v-else-if="type === 'next'">Next →</a>
            <component :is="originalElement" v-else />
          </template>
        </a-pagination>
      </div>
    </div>

    <!-- Create Instance Modal -->
    <CreateInstanceModal v-model:open="showCreateModal" @create="handleCreateInstance" />

    <!-- Create Instance Form -->
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

<style scoped lang="scss">
.modern-marketplace {
  width: 100%;
  padding: 0 24px 48px;
  background: var(--background-color);
}

// Hero Section
.hero-section {
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 50%, #D4AF37 100%);
  border-radius: 24px;
  padding: 60px 40px;
  margin-bottom: 40px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(255, 140, 66, 0.3);

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
    background-size: 50px 50px;
    animation: grid-move 20s linear infinite;
  }
}

@keyframes grid-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  text-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.hero-subtitle {
  font-size: 20px;
  color: rgba(255,255,255,0.95);
  margin: 0 0 24px 0;
  font-weight: 500;
}

.create-instance-btn {
  background: white;
  color: #FF6B35;
  border: none;
  font-weight: 600;
  font-size: 16px;
  height: 48px;
  padding: 0 32px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255,255,255,0.95);
    color: #FF6B35;
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

// Search Container
.search-container {
  margin-bottom: 32px;
}

.modern-search {
  :deep(.ant-input-affix-wrapper) {
    border: 3px solid var(--card-border-color);
    border-radius: 16px;
    background: var(--background-color-white);
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    transition: all 0.3s ease;
    padding: 8px 16px;

    &:hover, &:focus, &:focus-within {
      border-color: #FF8C42;
      box-shadow: 0 8px 32px rgba(255, 140, 66, 0.2);
      transform: translateY(-2px);
    }

    input {
      font-size: 16px;
      font-weight: 500;

      &::placeholder {
        color: #999;
      }
    }
  }

  .search-icon {
    font-size: 20px;
    color: #FF8C42;
  }
}

// Category Pills
.category-pills {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 40px;
  padding: 4px;
}

.category-pill {
  padding: 12px 24px;
  border-radius: 12px;
  background: var(--background-color-white);
  border: 2px solid var(--card-border-color);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);

  &:hover {
    border-color: #FF8C42;
    color: #FF8C42;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.15);
  }

  &.active {
    background: linear-gradient(135deg, #FF8C42, #FF6B35);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);
  }
}

// Featured Section
.featured-section {
  margin-bottom: 48px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-color);

  .anticon {
    color: #FF8C42;
  }
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
}

.featured-card {
  background: var(--background-color-white);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border: 2px solid var(--card-border-color);

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 16px 48px rgba(255, 140, 66, 0.25);

    .featured-image img {
      transform: scale(1.1);
    }

    .featured-overlay {
      background: rgba(0,0,0,0.4);
    }
  }
}

.featured-image {
  position: relative;
  height: 200px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .featured-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  }

  .featured-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    background: linear-gradient(135deg, #FF8C42, #FF6B35);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.4);
  }
}

.featured-info {
  padding: 24px;

  h3 {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 12px 0;
    color: var(--text-color);
  }

  p {
    color: var(--color-gray-8);
    margin: 0 0 16px 0;
    line-height: 1.6;
  }
}

.featured-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  .tag {
    background: rgba(255, 140, 66, 0.1);
    color: #FF6B35;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
  }
}

// Templates Section
.templates-section {
  margin-top: 48px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.template-card {
  background: var(--background-color-white);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  border: 2px solid var(--card-border-color);
  display: flex;
  flex-direction: column;
  height: 100%;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 32px rgba(255, 140, 66, 0.2);

    .template-image img {
      transform: scale(1.08);
    }
  }
}

.template-image {
  position: relative;
  height: 180px;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .template-platform {
    position: absolute;
    top: 12px;
    right: 12px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #FF6B35;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
}

.template-content {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.template-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text-color);
}

.template-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;

  .tag {
    background: rgba(255, 140, 66, 0.1);
    color: #FF6B35;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
  }
}

.template-description {
  color: var(--color-gray-8);
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 12px 0;
  flex: 1;
}

.template-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-gray-7);
  margin-bottom: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.template-footer {
  padding: 0 20px 20px;
}

.install-btn {
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border: none;
  border-radius: 12px;
  height: 44px;
  font-weight: 700;
  font-size: 15px;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(255, 140, 66, 0.4);
    background: linear-gradient(135deg, #FF6B35, #FF4500);
  }
}

// Empty State
.empty-state {
  text-align: center;
  padding: 80px 20px;

  .empty-icon {
    font-size: 80px;
    margin-bottom: 24px;
    opacity: 0.5;
  }

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-color);
    margin: 0 0 12px 0;
  }

  p {
    color: var(--color-gray-8);
    margin: 0 0 24px 0;
  }
}

// Pagination
.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 48px;

  :deep(.ant-pagination) {
    .ant-pagination-item {
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      font-weight: 600;

      &:hover {
        border-color: #FF8C42;
      }

      &-active {
        background: linear-gradient(135deg, #FF8C42, #FF6B35);
        border-color: transparent;

        a {
          color: white;
        }
      }
    }

    .ant-pagination-prev, .ant-pagination-next {
      a {
        color: #FF8C42;
        font-weight: 600;
      }
    }
  }
}

// Loading
.loading-container {
  text-align: center;
  padding: 80px 20px;

  p {
    margin-top: 24px;
    color: var(--color-gray-8);
    font-size: 16px;
  }
}

// Responsive
@media (max-width: 768px) {
  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .featured-grid {
    grid-template-columns: 1fr;
  }

  .category-pills {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
