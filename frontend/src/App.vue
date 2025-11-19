<script setup lang="ts">
import { onMounted } from "vue";
import AppConfigProvider from "./components/AppConfigProvider.vue";
import { RouterView, useRoute } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
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

const { isDarkTheme, setBackgroundImage } = useAppConfigStore();
const { getSettingsConfig, hasBgImage } = useLayoutConfigStore();
const route = useRoute();

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
      <!-- Show sidebar for logged-in pages (not login/install) -->
      <AppSidebar v-if="route.path !== '/login' && route.path !== '/install'" />

      <!-- Main Content Area -->
      <div class="main-content-wrapper" :class="{ 'with-sidebar': route.path !== '/login' && route.path !== '/install' }">
        <!-- Only show header when NOT on login/install pages -->
        <AppHeaderSimple v-if="route.path !== '/login' && route.path !== '/install'" />
        <RouterView :key="$route.fullPath" />
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

@media (max-width: 992px) {
  .main-content-wrapper.with-sidebar {
    margin-left: 0;
  }
}
</style>
