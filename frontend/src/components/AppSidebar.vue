<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";
import { originRouterConfig, ROLE } from "@/config/router";
import { logoutUser } from "@/services/apis/index";
import { message } from "ant-design-vue";
import { t } from "@/lang/i18n";
import {
  AppstoreOutlined,
  ShopOutlined,
  LineChartOutlined,
  TeamOutlined,
  ClusterOutlined,
  SettingOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  ExclamationCircleOutlined,
  WalletOutlined,
  CustomerServiceOutlined,
  IdcardOutlined
} from "@ant-design/icons-vue";

const router = useRouter();
const route = useRoute();
const { state } = useAppStateStore();
const { containerState } = useLayoutContainerStore();

const userPermission = computed(() => state.userInfo?.permission ?? 0);
const userName = computed(() => state.userInfo?.userName ?? "Guest");
const isSubUser = computed(() => state.userInfo?.isSubUser ?? false);

const userRole = computed(() => {
  if (userPermission.value >= ROLE.ADMIN) return "Administrator";
  if (isSubUser.value) return "Sub User";
  return "User";
});

const showLogoutModal = ref(false);
const { execute } = logoutUser();

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
    "/customer": AppstoreOutlined,
    "/account": IdcardOutlined,
    "/billing": WalletOutlined,
    "/support": CustomerServiceOutlined
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

function openLogoutModal() {
  showLogoutModal.value = true;
}

function closeLogoutModal() {
  showLogoutModal.value = false;
}

async function handleLogout() {
  try {
    await execute();
    message.success(t("TXT_CODE_11673d8c"));
    setTimeout(() => (window.location.href = "/"), 400);
  } catch (error) {
    message.error("Logout failed. Please try again.");
  }
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

    <!-- User Profile (Clickable for logout) -->
    <div class="sidebar-user" :class="{ collapsed: sidebarCollapsed }" @click="openLogoutModal">
      <div class="user-avatar">
        <UserOutlined />
      </div>
      <div v-if="!sidebarCollapsed" class="user-info">
        <div class="user-name">{{ userName }}</div>
        <div class="user-role">{{ userRole }}</div>
      </div>
      <LogoutOutlined v-if="!sidebarCollapsed" class="logout-icon" />
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

  <!-- Custom Logout Modal -->
  <div v-if="showLogoutModal" class="logout-modal-overlay" @click="closeLogoutModal">
    <div class="logout-modal" @click.stop>
      <div class="modal-icon">
        <ExclamationCircleOutlined />
      </div>
      <h2 class="modal-title">{{ t("TXT_CODE_9654b91c") || "Confirm Logout" }}</h2>
      <p class="modal-message">Are you sure you want to logout from your account?</p>
      <div class="modal-actions">
        <button class="modal-btn cancel-btn" @click="closeLogoutModal">
          Cancel
        </button>
        <button class="modal-btn logout-btn" @click="handleLogout">
          <LogoutOutlined />
          Logout
        </button>
      </div>
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
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);

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

    .sidebar-user {
      justify-content: center;
      padding: 14px 10px;
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
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.15), rgba(212, 175, 55, 0.15));
  margin: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 140, 66, 0.2);

  &:hover {
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.25), rgba(212, 175, 55, 0.25));
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 140, 66, 0.3);
  }

  &.collapsed {
    margin: 16px 8px;
    padding: 12px;
  }

  .user-avatar {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
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

  .logout-icon {
    font-size: 18px;
    opacity: 0.7;
    transition: opacity 0.3s ease;
  }

  &:hover .logout-icon {
    opacity: 1;
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

// Custom Logout Modal
.logout-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.logout-modal {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 450px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.3s ease;
  text-align: center;
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.modal-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.1), rgba(212, 175, 55, 0.1));
  border: 3px solid #FF8C42;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  color: #FF8C42;
}

.modal-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e1e2e;
  margin: 0 0 12px 0;
}

.modal-message {
  font-size: 16px;
  color: #666;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  padding: 14px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  min-width: 140px;

  &:active {
    transform: translateY(0);
  }
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;

  &:hover {
    background: #e8e8e8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.logout-btn {
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  color: white;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(255, 140, 66, 0.4);
  }
}

@media (max-width: 992px) {
  .app-sidebar {
    transform: translateX(-100%);

    &.mobile-open {
      transform: translateX(0);
    }
  }

  .logout-modal {
    padding: 32px 24px;
  }

  .modal-btn {
    padding: 12px 24px;
    font-size: 15px;
  }
}
</style>
