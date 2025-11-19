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
  opacity: 0.05;
  transition: all 0.3s ease;
}

.inner-card-wrapper {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--card-border-color);
  background: var(--background-color-white);
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
  box-shadow: 0 1px 3px var(--card-shadow-color);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, rgba(153, 27, 27, 0.8) 0%, rgba(212, 107, 8, 0.8) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
}

.inner-card-wrapper:hover {
  border-color: rgba(153, 27, 27, 0.3);
  box-shadow: 0 6px 16px var(--card-shadow-extend-color);
  transform: translateY(-2px);

  &::before {
    opacity: 1;
  }

  .bg-icon {
    opacity: 0.08;
    transform: scale(1.05);
  }
}

.inner-card-wrapper:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px var(--card-shadow-color);
}
</style>
