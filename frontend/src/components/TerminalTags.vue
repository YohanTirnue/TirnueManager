<script lang="ts" setup>
import type { TagInfo } from "./interface";

defineProps<{
  tags: TagInfo[];
  gap?: string;
}>();
</script>

<template>
  <div
    class="container"
    :style="{
      gap: gap || '6px'
    }"
  >
    <a-tag
      v-for="tag in tags"
      :key="tag.label"
      class="tag m-0"
      :color="tag.color"
      :style="{
        cursor: tag.onClick ? 'pointer' : 'default'
      }"
      @click="tag.onClick?.()"
    >
      <span>
        <component :is="tag.icon" v-if="tag.icon"></component>
      </span>
      <span>{{ tag.label }}</span>
      <span>{{ tag.value }}</span>
    </a-tag>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  justify-content: end;
  align-items: center;
}

.tag {
  align-items: center;
  display: flex;
  gap: 6px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag:hover {
  box-shadow: 0 2px 4px 0 var(--card-shadow-color);
  transform: translateY(-1px);
}
</style>
