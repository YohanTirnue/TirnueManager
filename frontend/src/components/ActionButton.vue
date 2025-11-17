<script setup lang="ts">
import { LinkOutlined } from "@ant-design/icons-vue";

defineProps<{
  icon?: any;
  title: string;
  click?: (...args: any) => any;
}>();
</script>

<template>
  <div class="actions-button w-100">
    <a-col :span="24">
      <div class="action-btn-item w-100 flex" @click="click">
        <div>
          <component :is="icon || LinkOutlined" />
        </div>
        <div class="ml-8">
          {{ title }}
        </div>
      </div>
    </a-col>
  </div>
</template>

<style scoped lang="scss">
.action-btn-item {
  padding: 20px 16px;
  border: 1px solid var(--card-border-color);
  background: linear-gradient(135deg, var(--background-color-white) 0%, var(--background-color) 100%);

  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 12px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(153, 27, 27, 0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    border: 1px solid rgba(220, 38, 38, 0.5);
    box-shadow: 0 8px 16px -4px rgba(220, 38, 38, 0.3);
    transform: translateY(-3px);

    &::before {
      opacity: 1;
    }
  }

  &:active {
    transform: translateY(-1px);
  }
}
</style>
