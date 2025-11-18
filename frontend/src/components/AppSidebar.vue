<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";
import { originRouterConfig, ROLE } from "@/config/router";
import {
  AppstoreOutlined,
  ShopOutlined,
  LineChartOutlined,
  TeamOutlined,
  ClusterOutlined,
  SettingOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from "@ant-design/icons-vue";

const router = useRouter();
const route = useRoute();
const { state } = useAppStateStore();
const { containerState } = useLayoutContainerStore();

const userPermission = computed(() => state.userInfo?.permission ?? 0);
const userName = computed(() => state.userInfo?.userName ?? "Guest");

const menuItems = computed(() => {
  return originRouterConfig
    .filter((r) => {
      if (!r.meta.mainMenu) return false;
      if (r.meta.onlyDisplayEditMode && !containerState.isDesignMode) return false;
      if (r.meta.condition && !r.meta.condition()) return false;
      if (r.path === "/" || r.path === "") return false;
      const requiredPermission = r.meta.permission ?? 0;
      return userPermission.value >= requiredPermission;
    })
    .map((r) => ({
      path: r.path,
      name: r.name,
      icon: getIconForRoute(r.path)
    }));
});

function getIconForRoute(path: string) {
  const iconMap: Record<string, any> = {
    "/instances": AppstoreOutlined,
    "/market": ShopOutlined,
    "/overview": LineChartOutlined,
    "/stats": LineChartOutlined,
    "/users": TeamOutlined,
    "/node": ClusterOutlined,
    "/settings": SettingOutlined,
    "/customer": UserOutlined
  };
  return iconMap[path] || AppstoreOutlined;
}

function navigateTo(path: string) {
  router.push(path);
}

function isActive(path: string) {
  return route.path.startsWith(path);
}

const sidebarCollapsed = computed({
  get: () => containerState.sidebarCollapsed ?? false,
  set: (val) => (containerState.sidebarCollapsed = val)
});

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}
</script>

<template>
  <div class="app-sidebar" :class="{ collapsed: sidebarCollapsed }">
    <!-- Logo Section -->
    <div class="sidebar-logo">
      <div class="logo-icon">
        <img src="/favicon.png" alt="Logo" class="logo-image" />
      </div>
      <span v-if="!sidebarCollapsed" class="logo-text">Tirnue</span>
    </div>

    <!-- User Profile -->
    <div class="sidebar-user" v-if="!sidebarCollapsed">
      <div class="user-avatar">
        <UserOutlined />
      </div>
      <div class="user-info">
        <div class="user-name">{{ userName }}</div>
        <div class="user-role">{{ userPermission >= ROLE.ADMIN ? "Administrator" : "User" }}</div>
      </div>
    </div>

    <!-- Navigation Menu -->
    <nav class="sidebar-nav">
      <div
        v-for="item in menuItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        @click="navigateTo(item.path)"
      >
        <component :is="item.icon" class="nav-icon" />
        <span v-if="!sidebarCollapsed" class="nav-text">{{ item.name }}</span>
        <span v-if="!sidebarCollapsed" class="nav-arrow">›</span>
      </div>
    </nav>

    <!-- Collapse Toggle -->
    <div class="sidebar-toggle" @click="toggleSidebar">
      <MenuFoldOutlined v-if="!sidebarCollapsed" />
      <MenuUnfoldOutlined v-else />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.app-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width, 240px);
  background: var(--sidebar-bg, linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%));
  color: var(--sidebar-text, #ffffff);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0 24px 24px 0;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);

  &.collapsed {
    width: 60px;

    .sidebar-logo {
      justify-content: center;
      padding: 20px 10px;
    }

    .nav-item {
      justify-content: center;
      padding: 14px 10px;
    }

    .sidebar-toggle {
      justify-content: center;
    }
  }
}

.sidebar-logo {
  display: flex;
  align-items: center;
  padding: 24px 20px;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .logo-image {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .logo-text {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: 1px;
  }
}

.sidebar-user {
  display: flex;
  align-items: center;
  padding: 20px;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  margin: 16px;
  border-radius: 12px;

  .user-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .user-info {
    flex: 1;
  }

  .user-name {
    font-size: 16px;
    font-weight: 600;
  }

  .user-role {
    font-size: 12px;
    opacity: 0.7;
  }
}

.sidebar-nav {
  flex: 1;
  padding: 10px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  margin: 4px 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 12px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .nav-icon {
    font-size: 20px;
    min-width: 20px;
  }

  .nav-text {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
  }

  .nav-arrow {
    font-size: 18px;
    opacity: 0.5;
  }
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 16px 20px;
  cursor: pointer;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 18px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

@media (max-width: 992px) {
  .app-sidebar {
    transform: translateX(-100%);

    &.mobile-open {
      transform: translateX(0);
    }
  }
}
</style>
