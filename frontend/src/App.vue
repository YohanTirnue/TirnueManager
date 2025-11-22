<script setup lang="ts">
import { onMounted } from "vue";
import AppConfigProvider from "./components/AppConfigProvider.vue";
import { useRoute } from "vue-router";
import AppHeaderSimple from "./components/AppHeaderSimple.vue";
import AppSidebar from "./components/AppSidebar.vue";
import { useAppConfigStore } from "@/stores/useAppConfigStore";
import InputDialogProvider from "./components/InputDialogProvider.vue";
import { Button, Select, Input, Table } from "ant-design-vue";
import MyselfInfoDialog from "./components/MyselfInfoDialog.vue";
import { closeAppLoading } from "./tools/dom";
import { useLayoutConfigStore } from "./stores/useLayoutConfig";
import UploadBubble from "@/components/UploadBubble.vue";
import { useSecurityRestrictions } from "@/hooks/useSecurityRestrictions";
import PermissionBanner from "@/components/PermissionBanner.vue";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { computed } from "vue";

const { isDarkTheme, setBackgroundImage } = useAppConfigStore();
const { getSettingsConfig, hasBgImage } = useLayoutConfigStore();
const { state } = useAppStateStore();
const route = useRoute();

// Pages accessible without login
const GUEST_PAGES = ['/login', '/install', '/welcome', '/shop', '/404', '/register', '/forgot-password', '/accept-invitation'];

// Only show sidebar/header when user is logged in and not on guest pages
const showAppLayout = computed(() => {
  const isGuestPage = GUEST_PAGES.includes(route.path) || route.path.startsWith('/accept-invitation');
  const isLoggedIn = !!state.userInfo?.token;
  return isLoggedIn && !isGuestPage;
});

// Check if we should show router content (logged in OR on a guest page)
const showRouterContent = computed(() => {
  const isGuestPage = GUEST_PAGES.includes(route.path) || route.path.startsWith('/accept-invitation');
  const isLoggedIn = !!state.userInfo?.token;
  return isLoggedIn || isGuestPage;
});

// Apply global security restrictions based on user permissions
useSecurityRestrictions();

const GLOBAL_COMPONENTS = [InputDialogProvider, MyselfInfoDialog];

function setBackground(url: string) {
  const body = document.querySelector("body");
  if (body) {
    setBackgroundImage(url);
    isDarkTheme()
      ? body.classList.add("app-dark-extend-theme")
      : body.classList.add("app-light-extend-theme");
  }
  hasBgImage.value = true;
}

if (isDarkTheme()) {
  document.body.classList.add("app-dark-theme");
} else {
  document.body.classList.add("app-light-theme");
}

[Button, Select, Input, Table].forEach((element) => {
  element.props.size.default = "large";
});

onMounted(async () => {
  const frontendSettings = await getSettingsConfig();
  if (frontendSettings?.theme?.backgroundImage)
    setBackground(frontendSettings.theme.backgroundImage);
  closeAppLoading();
});
</script>

<template>
  <AppConfigProvider :has-bg-image="hasBgImage">
    <!-- App Container with Sidebar -->
    <div class="global-app-container">
      <!-- Show sidebar only for logged-in users on non-guest pages -->
      <AppSidebar v-if="showAppLayout" />

      <!-- Main Content Area -->
      <div class="main-content-wrapper" :class="{ 'with-sidebar': showAppLayout }">
        <!-- Only show header for logged-in users -->
        <AppHeaderSimple v-if="showAppLayout" />

        <!-- Security Restrictions Banner (displays when any restriction is active) -->
        <div v-if="showAppLayout" class="security-banner-container">
          <PermissionBanner type="security" theme="red" />
        </div>

        <!-- Only render content for logged-in users or guest pages -->
        <template v-if="showRouterContent">
          <router-view v-slot="{ Component }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" :key="$route.fullPath" />
            </transition>
          </router-view>
        </template>
        <UploadBubble />
      </div>
    </div>

    <!-- Global Components -->
    <component :is="component" v-for="(component, index) in GLOBAL_COMPONENTS" :key="index" />
  </AppConfigProvider>
</template>

<style lang="scss" scoped>
.global-app-container {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.main-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: margin-left 0.3s ease;
  background: var(--background-color);

  &.with-sidebar {
    margin-left: var(--sidebar-width, 240px);
  }
}

.security-banner-container {
  padding: 16px 24px 0 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 992px) {
  .main-content-wrapper.with-sidebar {
    margin-left: 0;
  }

  .security-banner-container {
    padding: 12px 16px 0 16px;
  }
}

</style>

<style lang="scss">
// Page transition animations - industrial smooth fade (global)
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.page-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
