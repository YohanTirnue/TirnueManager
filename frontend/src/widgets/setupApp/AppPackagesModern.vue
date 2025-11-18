<script setup lang="ts">
import { ref } from "vue";
import { RocketOutlined, PlusCircleOutlined } from "@ant-design/icons-vue";
import CreateInstanceModal from "@/widgets/setupApp/CreateInstanceModal.vue";

const showCreateModal = ref(false);
</script>

<template>
  <div class="modern-marketplace">
    <!-- Hero Section with Create Button -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-icon">
          <RocketOutlined />
        </div>
        <h1 class="hero-title">Instance Manager</h1>
        <p class="hero-subtitle">Create and manage your game servers, bots, and applications</p>
        <a-button
          type="primary"
          size="large"
          class="create-instance-btn"
          @click="showCreateModal = true"
        >
          <template #icon><PlusCircleOutlined /></template>
          Create Instance
        </a-button>
      </div>
    </div>

    <!-- Create Instance Modal -->
    <CreateInstanceModal v-model:open="showCreateModal" />
  </div>
</template>

<style scoped lang="scss">
.modern-marketplace {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

// Hero Section
.hero-section {
  background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 50%, #D4AF37 100%);
  border-radius: 24px;
  padding: 80px 60px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(255, 140, 66, 0.3);
  width: 100%;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
    background-size: 50px 50px;
    animation: grid-move 20s linear infinite;
  }
}

@keyframes grid-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-icon {
  font-size: 80px;
  color: white;
  margin-bottom: 24px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.hero-title {
  font-size: 56px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  text-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.hero-subtitle {
  font-size: 22px;
  color: rgba(255,255,255,0.95);
  margin: 0 0 32px 0;
  font-weight: 500;
}

.create-instance-btn {
  background: white;
  color: #FF6B35;
  border: none;
  font-weight: 600;
  font-size: 18px;
  height: 56px;
  padding: 0 40px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255,255,255,0.95);
    color: #FF6B35;
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(0,0,0,0.3);
  }

  &:active {
    transform: translateY(0);
  }
}
</style>
