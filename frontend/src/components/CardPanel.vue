<script setup lang="ts">
import { useLayoutContainerStore } from "@/stores/useLayoutContainerStore";

const props = defineProps({
  fullHeight: {
    type: Boolean,
    default: true
  },
  padding: {
    type: Boolean,
    default: true
  }
});

const { containerState } = useLayoutContainerStore();
</script>

<template>
  <div
    :class="{
      'card-panel': true,
      'global-card-container-shadow': true,
      'h-100': props.fullHeight,
      padding: props.padding
    }"
  >
    <div v-if="$slots.title" class="card-panel-title">
      <div>
        <a-typography-title :level="5" style="margin-bottom: 0px">
          <slot name="title"></slot>
        </a-typography-title>
      </div>
      <div>
        <a-typography-text>
          <slot name="operator"></slot>
          <slot v-if="containerState.isDesignMode" name="operator-design"></slot>
        </a-typography-text>
      </div>
    </div>
    <div class="card-panel-content">
      <slot name="body"></slot>
      <slot v-if="containerState.isDesignMode" name="body-design"></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import "@/assets/global.scss";

.padding {
  padding: 20px;
}

.card-panel {
  border: 1px solid var(--card-border-color);
  background: var(--background-color-white);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(220, 38, 38, 0.3);
  }

  .card-panel-title {
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.02em;

    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: -4px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--card-border-color);
  }

  .card-panel-content {
    flex-grow: 1;
    color: var(--text-color);
    position: relative;
  }
}

.card-panel-content {
  overflow: hidden;
  zoom: 1;
  word-break: break-all;
}
</style>
