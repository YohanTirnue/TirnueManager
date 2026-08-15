<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  label: string;
  value: number;
  max: number;
  unit?: string;
  color?: string;
  showLabel?: boolean;
}>();

const percentage = computed(() => {
  if (props.max === 0) return 0;
  return Math.min((props.value / props.max) * 100, 100);
});

const displayValue = computed(() => {
  const unit = props.unit || "";
  return `${props.value.toFixed(1)}${unit} / ${props.max}${unit}`;
});

const gradientColor = computed(() => {
  const pct = percentage.value;
  const baseColor = props.color || "var(--theme-primary-color)";

  if (pct < 50) {
    return `linear-gradient(90deg, #52c41a, ${baseColor})`;
  }
  if (pct < 80) {
    return `linear-gradient(90deg, ${baseColor}, #faad14)`;
  }
  return `linear-gradient(90deg, #faad14, #ff4d4f)`;
});
</script>

<template>
  <div class="resource-bar">
    <div v-if="showLabel !== false" class="resource-label">
      <span class="label-text">{{ label }}</span>
      <span class="resource-value">{{ displayValue }}</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill" :style="{ width: percentage + '%', background: gradientColor }" />
      <div class="progress-percentage">{{ percentage.toFixed(0) }}%</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.resource-bar {
  width: 100%;
}

.resource-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  margin-bottom: 6px;
}

.label-text {
  font-weight: 600;
  color: var(--color-gray-9);
}

.resource-value {
  font-weight: 600;
  color: var(--color-gray-10);
  font-size: 11px;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 24px;
  background: var(--color-gray-3);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 12px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease;
  will-change: width;
}

.progress-percentage {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-gray-12);
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  z-index: 1;
  pointer-events: none;
}

@media (max-width: 768px) {
  .progress-track {
    height: 20px;
  }

  .progress-percentage {
    font-size: 10px;
  }
}
</style>
