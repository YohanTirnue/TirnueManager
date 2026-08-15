<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";
import {
  BuildOutlined,
  SaveOutlined,
  CloseCircleOutlined,
  BulbOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { useLayoutConfigStore } from "../stores/useLayoutConfig";
import { useAppConfigStore, THEME } from "@/stores/useAppConfigStore";

const { isAdmin } = useAppStateStore();
const { containerState, changeDesignMode } = useLayoutContainerStore();
const { saveGlobalLayoutConfig, resetGlobalLayoutConfig } = useLayoutConfigStore();
const { setTheme, getTheme } = useAppConfigStore();
const route = useRoute();

const breadcrumbs = computed(() => {
  const arr: Array<{ name: string; path: string }> = [];
  if (route.meta?.breadcrumbs && Array.isArray(route.meta.breadcrumbs) && route.meta.breadcrumbs.length > 0) {
    arr.push({
      name: route.meta.breadcrumbs[0]?.name || "",
      path: route.meta.breadcrumbs[0]?.path || ""
    });
  }
  arr.push({ name: String(route.name || ""), path: route.path });
  return arr.filter((v) => v.name);
});

const saveLayout = async () => {
  await saveGlobalLayoutConfig();
  message.success("Layout saved!");
};

const resetLayout = async () => {
  await resetGlobalLayoutConfig();
  message.success("Layout reset!");
  window.location.reload();
};

const toggleTheme = () => {
  const currentTheme = getTheme();
  const newTheme = currentTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
  setTheme(newTheme);
};
</script>

<template>
  <div class="app-header-simple">
    <!-- Breadcrumbs -->
    <div class="header-breadcrumbs">
      <span v-for="(item, index) in breadcrumbs" :key="index" class="breadcrumb-item">
        {{ item.name }}
        <span v-if="index < breadcrumbs.length - 1" class="breadcrumb-separator">/</span>
      </span>
    </div>

    <!-- Right Actions -->
    <div class="header-actions">
      <!-- Theme Toggle (Always visible) -->
      <button class="action-btn" @click="toggleTheme" title="Toggle Light/Dark Mode">
        <BulbOutlined />
      </button>

      <!-- Design Mode Tools (Admin Only) -->
      <template v-if="isAdmin && containerState.isDesignMode">
        <button class="action-btn" @click="saveLayout" title="Save Layout">
          <SaveOutlined />
        </button>
        <button class="action-btn" @click="resetLayout" title="Reset Layout">
          <CloseCircleOutlined />
        </button>
        <button class="action-btn" @click="changeDesignMode(false)" title="Exit Design Mode">
          <BuildOutlined />
        </button>
      </template>
      <button v-else-if="isAdmin" class="action-btn" @click="changeDesignMode(true)" title="Design Mode">
        <BuildOutlined />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-header-simple {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 70px;
  background: var(--background-color-white);
  border-bottom: 1px solid var(--card-border-color);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: none; /* Optimized */
  flex-shrink: 0;
}

.header-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: var(--text-color);
  flex: 1;
  min-width: 0;

  .breadcrumb-item {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:last-child {
      color: var(--text-color);
      font-weight: 700;
      font-size: 20px;
    }
  }

  .breadcrumb-separator {
    margin: 0 12px;
    opacity: 0.4;
    font-size: 14px;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--card-border-color);
  background: var(--background-color);
  color: var(--text-color);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: var(--text-color);
    border-color: var(--text-color);
    color: var(--background-color-white);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px var(--card-shadow-color);
  }
}

@media (max-width: 992px) {
  .header-breadcrumbs {
    display: none;
  }
}
</style>
