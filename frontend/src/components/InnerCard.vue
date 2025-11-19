<script setup lang="ts">
import type { FunctionalComponent } from "vue";

const props = defineProps<{
  icon?: FunctionalComponent;
}>();
</script>

<template>
  <div class="inner-card-wrapper">
    <div class="inner-card-container">
      <a-typography-text strong>
        <slot name="title"></slot>
      </a-typography-text>
      <div class="mt-10">
        <a-typography-text>
          <slot name="body"></slot>
        </a-typography-text>

        <div v-if="props.icon" class="bg-icon">
          <component :is="props.icon"></component>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bg-icon {
  position: absolute;
  right: 16px;
  font-size: 48px;
  bottom: 12px;
  color: var(--color-gray-12);
  opacity: 0.06;
  transition: all 0.3s ease;
}

.inner-card-wrapper {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--color-gray-3);
  background: linear-gradient(135deg, var(--color-gray-1) 0%, var(--color-gray-2) 100%);
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #1890ff 0%, #52c41a 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}

.inner-card-wrapper:hover {
  border: 1px solid var(--color-gray-6);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);

  &::before {
    opacity: 1;
  }

  .bg-icon {
    opacity: 0.1;
    transform: scale(1.05);
  }
}

.inner-card-wrapper:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
</style>
