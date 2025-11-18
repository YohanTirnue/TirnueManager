<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAppConfigStore, THEME } from "@/stores/useAppConfigStore";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";
import { logoutUser } from "@/services/apis/index";
import {
  BgColorsOutlined,
  UserOutlined,
  LogoutOutlined,
  BuildOutlined,
  SaveOutlined,
  CloseCircleOutlined,
  MenuOutlined
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { useLayoutConfigStore } from "../stores/useLayoutConfig";

const { setTheme } = useAppConfigStore();
const { isAdmin, state: appState } = useAppStateStore();
const { containerState, changeDesignMode } = useLayoutContainerStore();
const { saveGlobalLayoutConfig, resetGlobalLayoutConfig } = useLayoutConfigStore();
const { execute } = logoutUser();
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

const toggleTheme = () => {
  setTheme(THEME.DARK);
};

const handleLogout = async () => {
  await execute({});
  window.location.href = "/#/login";
  window.location.reload();
};

const saveLayout = async () => {
  await saveGlobalLayoutConfig();
  message.success("Layout saved!");
};

const resetLayout = async () => {
  await resetGlobalLayoutConfig();
  message.success("Layout reset!");
  window.location.reload();
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

      <!-- Theme Toggle -->
      <button class="action-btn" @click="toggleTheme" title="Toggle Theme">
        <BgColorsOutlined />
      </button>

      <!-- User Menu -->
      <div class="user-menu">
        <UserOutlined class="user-icon" />
        <span class="user-name">{{ appState.userInfo?.userName }}</span>
        <div class="user-dropdown">
          <div class="dropdown-item" @click="handleLogout">
            <LogoutOutlined />
            <span>Logout</span>
          </div>
        </div>
      </div>
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
  backdrop-filter: blur(10px);
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
      color: var(--color-orange-6);
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
    background: var(--color-orange-1);
    border-color: var(--color-orange-4);
    color: var(--color-orange-7);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px var(--card-shadow-color);
  }
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 12px;
  background: var(--background-color);
  border: 1px solid var(--card-border-color);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-orange-1);
    border-color: var(--color-orange-4);
    box-shadow: 0 4px 8px var(--card-shadow-color);

    .user-dropdown {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }
  }

  .user-icon {
    font-size: 20px;
    color: var(--color-orange-6);
  }

  .user-name {
    font-weight: 600;
    font-size: 14px;
  }
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--background-color-white);
  border: 1px solid var(--card-border-color);
  border-radius: 10px;
  box-shadow: 0 4px 12px var(--card-shadow-color);
  min-width: 150px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.2s ease;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: var(--color-gray-1);
  }

  &:first-child {
    border-radius: 10px 10px 0 0;
  }

  &:last-child {
    border-radius: 0 0 10px 10px;
  }
}

@media (max-width: 992px) {
  .header-breadcrumbs {
    display: none;
  }

  .user-name {
    display: none;
  }
}
</style>
