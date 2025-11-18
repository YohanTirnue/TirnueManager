<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "online" | "offline" | "slow" | "error";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  pulse?: boolean;
}>();

const sizeMap = {
  small: "8px",
  medium: "12px",
  large: "16px"
};

const dotSize = computed(() => sizeMap[props.size || "medium"]);

const statusConfig = computed(() => {
  switch (props.status) {
    case "online":
      return { color: "#52c41a", label: "Online" };
    case "slow":
      return { color: "#faad14", label: "Slow" };
    case "error":
      return { color: "#ff4d4f", label: "Error" };
    case "offline":
    default:
      return { color: "#8c8c8c", label: "Offline" };
  }
});
</script>

<template>
  <div class="status-dot-container">
    <div
      class="status-dot"
      :class="{ pulse: pulse !== false && status === 'online' }"
      :style="{
        width: dotSize,
        height: dotSize,
        backgroundColor: statusConfig.color
      }"
    />
    <span v-if="showLabel" class="status-label">{{ statusConfig.label }}</span>
  </div>
</template>

<style lang="scss" scoped>
.status-dot-container {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  border-radius: 50%;
  box-shadow: 0 0 8px currentColor;
  transition: all 0.3s ease;
  flex-shrink: 0;

  &.pulse {
    animation: pulse-dot 2s infinite;
  }
}

.status-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-gray-9);
  white-space: nowrap;
}

@keyframes pulse-dot {
  0%,
  100% {
    box-shadow: 0 0 8px currentColor;
  }
  50% {
    box-shadow: 0 0 16px currentColor, 0 0 24px currentColor;
  }
}
</style>
