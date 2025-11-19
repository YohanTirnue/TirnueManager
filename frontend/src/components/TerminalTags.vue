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

<style scoped lang="scss">
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
  border-radius: 8px !important;
  padding: 6px 14px !important;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px var(--card-shadow-color);

  span {
    display: inline-flex;
    align-items: center;
  }
}

.tag:hover {
  box-shadow: 0 4px 8px var(--card-shadow-extend-color);
  transform: translateY(-1px);
  border-color: rgba(153, 27, 27, 0.4);
}

.tag:active {
  transform: translateY(0);
}
</style>
