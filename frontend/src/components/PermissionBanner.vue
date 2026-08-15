<script setup lang="ts">
import { computed } from "vue";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { UserOutlined, ControlOutlined, FileOutlined, SafetyOutlined } from "@ant-design/icons-vue";

interface Props {
  type?: "instance" | "file" | "security" | "custom";
  customPermissions?: string[];
  theme?: "orange" | "red" | "blue" | "gold";
}

const props = withDefaults(defineProps<Props>(), {
  type: "instance",
  theme: "orange"
});

const { userPermissions, isAdmin } = useUserPermissions();

// Determine icon based on type
const icon = computed(() => {
  switch (props.type) {
    case "file":
      return FileOutlined;
    case "security":
      return SafetyOutlined;
    case "custom":
      return ControlOutlined;
    default:
      return UserOutlined;
  }
});

// Get permissions list based on type
const permissionsList = computed(() => {
  if (isAdmin.value) return null; // Admins don't need permission notices

  if (props.customPermissions) {
    return props.customPermissions.length > 0 ? props.customPermissions : null;
  }

  const perms = userPermissions.value;
  const available: string[] = [];

  if (props.type === "instance") {
    if (perms.canStartInstances) available.push("Start");
    if (perms.canStopInstances) available.push("Stop");
    if (perms.canRestartInstances) available.push("Restart");
    if (perms.canAccessConsole) available.push("Console");
    if (perms.canViewLogs) available.push("Logs");
  } else if (props.type === "file") {
    if (perms.canUploadFiles) available.push("Upload");
    if (perms.canDownloadFiles) available.push("Download");
    if (perms.canDeleteFiles) available.push("Delete");
    if (perms.canModifyFiles) available.push("Edit/Modify");
  } else if (props.type === "security") {
    if (perms.disableRightClick) available.push("Right-Click Disabled");
    if (perms.disableKeyboardShortcuts) available.push("Shortcuts Disabled");
    if (perms.disableTextSelection) available.push("Selection Disabled");
    if (perms.disableCopy) available.push("Copy Disabled");
    if (perms.disablePaste) available.push("Paste Disabled");
  }

  return available.length > 0 ? available : null;
});

// Theme colors
const themeColors = computed(() => {
  switch (props.theme) {
    case "red":
      return {
        bg: "rgba(153, 27, 27, 0.08), rgba(212, 107, 8, 0.08)",
        border: "rgba(153, 27, 27, 0.25)",
        icon: "rgba(153, 27, 27, 0.9)",
        label: "rgba(153, 27, 27, 0.9)"
      };
    case "blue":
      return {
        bg: "rgba(59, 130, 246, 0.08), rgba(37, 99, 235, 0.08)",
        border: "rgba(59, 130, 246, 0.25)",
        icon: "rgba(59, 130, 246, 0.9)",
        label: "rgba(59, 130, 246, 0.9)"
      };
    case "gold":
      return {
        bg: "rgba(212, 175, 55, 0.08), rgba(255, 215, 0, 0.08)",
        border: "rgba(212, 175, 55, 0.25)",
        icon: "rgba(212, 175, 55, 0.9)",
        label: "rgba(212, 175, 55, 0.9)"
      };
    default: // orange
      return {
        bg: "var(--theme-shadow-hover), rgba(212, 175, 55, 0.08)",
        border: "var(--theme-shadow-hover)",
        icon: "var(--theme-primary-color)",
        label: "var(--theme-primary-color)"
      };
  }
});
</script>

<template>
  <div
    v-if="permissionsList"
    class="permission-banner"
    :style="{
      background: `linear-gradient(135deg, ${themeColors.bg})`,
      borderColor: themeColors.border
    }"
  >
    <component
      :is="icon"
      class="permission-banner-icon"
      :style="{ color: themeColors.icon }"
    />
    <div class="permission-banner-text">
      <span class="permission-banner-label" :style="{ color: themeColors.label }">
        {{ type === "file" ? "File Permissions:" : type === "security" ? "Security Restrictions:" : "Your Permissions:" }}
      </span>
      <span class="permission-banner-list">{{ permissionsList.join(", ") }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.permission-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 2px solid;
  border-radius: 10px;
  margin-bottom: 16px;
  animation: slide-in 0.3s ease-out;

  .permission-banner-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .permission-banner-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .permission-banner-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .permission-banner-list {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-gray-10);
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
