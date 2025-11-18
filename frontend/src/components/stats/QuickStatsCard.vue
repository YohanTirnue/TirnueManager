<script setup lang="ts">
import CardPanel from "@/components/CardPanel.vue";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons-vue";
import { computed } from "vue";

const props = defineProps<{
  title: string;
  value: string | number;
  trend?: number;
  subtitle?: string;
  icon?: any;
  color?: string;
}>();

const iconColor = computed(() => props.color || "#FF8C42");
</script>

<template>
  <CardPanel class="quick-stat-card">
    <template #body>
      <div class="stat-content">
        <div class="stat-icon" :style="{ color: iconColor }">
          <component v-if="icon" :is="icon" />
        </div>
        <div class="stat-details">
          <div class="stat-title">{{ title }}</div>
          <div class="stat-value">
            {{ value }}
            <span v-if="trend !== undefined" class="stat-trend" :class="trend > 0 ? 'up' : 'down'">
              <ArrowUpOutlined v-if="trend > 0" />
              <ArrowDownOutlined v-else />
              {{ Math.abs(trend) }}%
            </span>
          </div>
          <div v-if="subtitle" class="stat-subtitle">{{ subtitle }}</div>
        </div>
      </div>
    </template>
  </CardPanel>
</template>

<style lang="scss" scoped>
.quick-stat-card {
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.03), rgba(212, 175, 55, 0.03));
  border: 2px solid rgba(255, 140, 66, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 140, 66, 0.4);
    box-shadow: 0 8px 20px rgba(255, 140, 66, 0.2);
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.stat-icon {
  font-size: 48px;
  opacity: 0.8;
  min-width: 48px;
  transition: all 0.3s ease;

  .quick-stat-card:hover & {
    opacity: 1;
    transform: scale(1.1);
  }
}

.stat-details {
  flex: 1;
  min-width: 0;
}

.stat-title {
  font-size: 13px;
  color: var(--color-gray-8);
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-trend {
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 4px;

  &.up {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
  }

  &.down {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
  }
}

.stat-subtitle {
  font-size: 12px;
  color: var(--color-gray-7);
  margin-top: 4px;
}

@media (max-width: 768px) {
  .stat-icon {
    font-size: 36px;
    min-width: 36px;
  }

  .stat-value {
    font-size: 22px;
  }
}
</style>
