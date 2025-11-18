<script setup lang="ts">
import { router } from "@/config/router";
import { t } from "@/lang/i18n";
import { loginPageInfo, loginUser } from "@/services/apis";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { sleep } from "@/tools/common";
import { reportErrorMsg } from "@/tools/validator";
import type { LayoutCard } from "@/types";
import {
  CheckCircleOutlined,
  LoadingOutlined,
  LockOutlined,
  UserOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  CloudServerOutlined
} from "@ant-design/icons-vue";
import { message, Modal } from "ant-design-vue";
import { onMounted, reactive, ref } from "vue";

const { state: pageInfoResult, execute } = loginPageInfo();

const props = defineProps<{
  card?: LayoutCard;
}>();

const formData = reactive({
  username: "",
  password: "",
  code: ""
});

const { execute: login } = loginUser();
const { updateUserInfo, isAdmin, state: appConfig } = useAppStateStore();

const loginStep = ref(0);
const is2Fa = ref(false);

const handleLogin = async () => {
  if (!formData.username.trim() || !formData.password.trim()) {
    return message.error(t("TXT_CODE_c846074d"));
  }
  try {
    loginStep.value++;
    await sleep(600);
    const result = await login({
      data: formData
    });
    if (result.value === "NEED_2FA") {
      loginStep.value = 0;
      is2Fa.value = true;
      return;
    }
    is2Fa.value = false;
    await sleep(600);
    await handleNext();
  } catch (error: any) {
    loginStep.value = 0;
    reportErrorMsg(error);
  }
};

const handleNext = async () => {
  try {
    await updateUserInfo();
    loginStep.value++;
    await sleep(1000);
    loginSuccess();
  } catch (error: any) {
    console.error(error);
    loginStep.value = 0;
    Modal.error({
      title: t("TXT_CODE_da2fb99a"),
      content: t("TXT_CODE_6e718abe")
    });
  }
};

const loginSuccess = () => {
  loginStep.value++;
  if (isAdmin.value) {
    router.push({
      path: "/"
    });
  } else {
    router.push({ path: "/customer" });
  }
};

const openBuyInstanceDialog = async () => {
  router.push({ path: "/shop" });
};

onMounted(async () => {
  await execute();
  if (!appConfig.isInstall) router.push({ path: "/install" });
});
</script>

<template>
  <div class="modern-login-page">
    <!-- Animated Background -->
    <div class="background-gradient">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Main Container -->
    <div class="login-container">
      <!-- Left Side - Branding -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-icon">
            <RocketOutlined />
          </div>
          <h1 class="brand-title">
            Welcome to <span class="highlight">Tirnue</span>
          </h1>
          <p class="brand-subtitle">
            An under development panel server
          </p>

          <div class="features-list">
            <div class="feature-item">
              <ThunderboltOutlined class="feature-icon" />
              <div class="feature-text">
                <h3>High Performance</h3>
                <p>Lightning-fast server management</p>
              </div>
            </div>
            <div class="feature-item">
              <CloudServerOutlined class="feature-icon" />
              <div class="feature-text">
                <h3>Cloud-Ready</h3>
                <p>Deploy anywhere, manage everywhere</p>
              </div>
            </div>
            <div class="feature-item">
              <RocketOutlined class="feature-icon" />
              <div class="feature-text">
                <h3>Modern Interface</h3>
                <p>Beautiful and intuitive design</p>
              </div>
            </div>
          </div>

          <div class="brand-footer">
            <div class="version-badge">v2.0 Beta</div>
          </div>
        </div>
      </div>

      <!-- Right Side - Login Form -->
      <div class="form-section">
        <div class="form-container">
          <!-- Login Step 0: Form -->
          <div v-show="loginStep === 0" class="form-content">
            <div class="form-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to access the panel</p>
            </div>

            <form @submit.prevent="handleLogin" class="login-form">
              <div v-if="!is2Fa" class="form-inputs">
                <div class="input-group">
                  <label>Username</label>
                  <a-input
                    v-model:value="formData.username"
                    size="large"
                    name="mcsm-name-input"
                    placeholder="Enter your username"
                    class="modern-input"
                  >
                    <template #prefix>
                      <UserOutlined class="input-icon" />
                    </template>
                  </a-input>
                </div>

                <div class="input-group">
                  <label>Password</label>
                  <a-input-password
                    v-model:value="formData.password"
                    size="large"
                    name="mcsm-pw-input"
                    placeholder="Enter your password"
                    class="modern-input"
                    @press-enter="handleLogin"
                  >
                    <template #prefix>
                      <LockOutlined class="input-icon" />
                    </template>
                  </a-input-password>
                </div>
              </div>

              <div v-else class="form-inputs">
                <div class="input-group">
                  <label>Two-Factor Authentication Code</label>
                  <a-input
                    v-model:value="formData.code"
                    size="large"
                    type="text"
                    placeholder="Enter 6-digit code"
                    autocomplete="off"
                    name="mcsm-pw-2fa"
                    class="modern-input"
                    @press-enter="handleLogin"
                  >
                    <template #prefix>
                      <LockOutlined class="input-icon" />
                    </template>
                  </a-input>
                </div>
              </div>

              <div class="form-actions">
                <a-button
                  type="primary"
                  size="large"
                  block
                  class="login-button"
                  @click="handleLogin"
                >
                  Sign In
                </a-button>

                <a-button
                  v-if="appConfig.settings.businessMode"
                  size="large"
                  block
                  class="secondary-button"
                  @click="openBuyInstanceDialog"
                >
                  {{ t("TXT_CODE_5a408a5e") }}
                </a-button>
              </div>
            </form>
          </div>

          <!-- Login Step 1: Loading -->
          <div v-show="loginStep === 1" class="status-screen">
            <LoadingOutlined class="status-icon loading-icon" />
            <h3>Authenticating...</h3>
            <p>Please wait while we verify your credentials</p>
          </div>

          <!-- Login Step 2+: Success -->
          <div v-show="loginStep >= 2" class="status-screen">
            <CheckCircleOutlined class="status-icon success-icon" />
            <h3>Login Successful!</h3>
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modern-login-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
}

// Animated Background
.background-gradient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s infinite ease-in-out;

  &.orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #FF8C42, transparent);
    top: -10%;
    left: -10%;
    animation-delay: 0s;
  }

  &.orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #D4AF37, transparent);
    bottom: -10%;
    right: -10%;
    animation-delay: 7s;
  }

  &.orb-3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, #FF6B35, transparent);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 14s;
  }
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(50px, 50px) scale(1.1); }
  50% { transform: translate(-30px, 80px) scale(0.9); }
  75% { transform: translate(70px, -40px) scale(1.05); }
}

// Main Container
.login-container {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  width: 90%;
  max-width: 1400px;
  height: 90vh;
  max-height: 800px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

// Brand Section (Left)
.brand-section {
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%);
  padding: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 140, 66, 0.1), transparent 50%);
    animation: rotate 30s linear infinite;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: left;
  max-width: 500px;
}

.brand-icon {
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: white;
  margin-bottom: 32px;
  box-shadow: 0 10px 30px rgba(255, 140, 66, 0.3);
  animation: pulse-icon 3s ease-in-out infinite;
}

@keyframes pulse-icon {
  0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(255, 140, 66, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 15px 40px rgba(255, 140, 66, 0.5); }
}

.brand-title {
  font-size: 48px;
  font-weight: 800;
  color: white;
  margin: 0 0 16px 0;
  line-height: 1.2;

  .highlight {
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.brand-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 48px;
  font-weight: 400;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 48px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(8px);
    border-color: rgba(255, 140, 66, 0.3);
  }
}

.feature-icon {
  font-size: 32px;
  color: #FF8C42;
  flex-shrink: 0;
}

.feature-text {
  flex: 1;

  h3 {
    font-size: 18px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px 0;
  }

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
}

.brand-footer {
  display: flex;
  align-items: center;
  gap: 16px;
}

.version-badge {
  padding: 8px 16px;
  background: rgba(255, 140, 66, 0.2);
  border: 1px solid rgba(255, 140, 66, 0.3);
  border-radius: 20px;
  color: #FF8C42;
  font-size: 14px;
  font-weight: 600;
}

// Form Section (Right)
.form-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-container {
  width: 100%;
  max-width: 420px;
}

.form-content {
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.form-header {
  margin-bottom: 40px;
  text-align: center;

  h2 {
    font-size: 36px;
    font-weight: 800;
    color: #1e1e2e;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 16px;
    color: #666;
    margin: 0;
  }
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-inputs {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }
}

.modern-input {
  :deep(.ant-input),
  :deep(.ant-input-password) {
    font-size: 16px;
    padding: 12px 16px;
    border: 2px solid #e8e8e8;
    border-radius: 12px;
    transition: all 0.3s ease;

    &:hover {
      border-color: #FF8C42;
    }

    &:focus {
      border-color: #FF8C42;
      box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.1);
    }
  }

  :deep(.ant-input-prefix) {
    margin-right: 12px;
  }
}

.input-icon {
  color: #999;
  font-size: 18px;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.login-button {
  height: 52px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF8C42, #FF6B35);
  border: none;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(255, 140, 66, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

.secondary-button {
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 12px;
  border: 2px solid #e8e8e8;
  color: #666;
  transition: all 0.3s ease;

  &:hover {
    border-color: #FF8C42;
    color: #FF8C42;
  }
}

// Status Screens
.status-screen {
  text-align: center;
  padding: 60px 20px;
  animation: fadeIn 0.5s ease;

  .status-icon {
    font-size: 80px;
    margin-bottom: 24px;
  }

  .loading-icon {
    color: #FF8C42;
    animation: spin 1s linear infinite;
  }

  .success-icon {
    color: #52c41a;
    animation: scaleIn 0.5s ease;
  }

  h3 {
    font-size: 28px;
    font-weight: 700;
    color: #1e1e2e;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 16px;
    color: #666;
    margin: 0;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes scaleIn {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

// Responsive Design
@media (max-width: 1200px) {
  .login-container {
    grid-template-columns: 1fr;
    width: 95%;
    max-width: 500px;
  }

  .brand-section {
    display: none;
  }

  .form-section {
    padding: 40px 24px;
  }
}

@media (max-width: 768px) {
  .login-container {
    width: 100%;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }

  .form-section {
    padding: 32px 20px;
  }

  .form-header h2 {
    font-size: 28px;
  }
}

// Override autofill styles
:deep(input:-webkit-autofill) {
  -webkit-text-fill-color: #333 !important;
  -webkit-box-shadow: 0 0 0px 1000px white inset !important;
  background-color: white !important;
  transition: background-color 5000s ease-in-out 0s;
}
</style>
