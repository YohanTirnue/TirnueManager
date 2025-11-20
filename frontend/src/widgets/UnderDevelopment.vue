<script setup lang="ts">
import { ToolOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

const props = defineProps<{
  title?: string;
  description?: string;
}>();

const pageTitle = computed(() => props.title || "Coming Soon");
const pageDescription = computed(() => props.description || "This feature is currently under development. Check back soon!");
</script>

<template>
  <div class="under-development">
    <div class="dev-content">
      <div class="dev-icon">
        <ToolOutlined />
      </div>
      <h2>{{ pageTitle }}</h2>
      <p>{{ pageDescription }}</p>
      <div class="dev-badge">Under Development</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.under-development {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
}

.dev-content {
  text-align: center;
  max-width: 400px;
}

.dev-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.2), rgba(212, 175, 55, 0.2));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  color: #FF8C42;
}

h2 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--color-text-1);
}

p {
  font-size: 14px;
  color: var(--color-text-3);
  margin: 0 0 24px;
  line-height: 1.6;
}

.dev-badge {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(255, 140, 66, 0.15);
  border: 1px solid rgba(255, 140, 66, 0.3);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #FF8C42;
}
</style>
