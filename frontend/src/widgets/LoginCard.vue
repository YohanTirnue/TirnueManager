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

const turnstileToken = ref("");

const { execute: login } = loginUser();
const { updateUserInfo, isAdmin, state: appConfig } = useAppStateStore();

const loginStep = ref(0);
const is2Fa = ref(false);

// Animation states
const showLogo = ref(false);
const showBrandName = ref(false);
const showLoginForm = ref(false);

const handleLogin = async () => {
  if (!formData.username.trim() || !formData.password.trim()) {
    return reportErrorMsg({ message: t("TXT_CODE_c846074d") });
  }
  try {
    loginStep.value++;
    await sleep(600);
    const result = await login({
      data: {
        ...formData,
        turnstileToken: turnstileToken.value || undefined
      }
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
    reportErrorMsg({ message: t("TXT_CODE_6e718abe") });
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

  // Listen for loading animation completion
  window.addEventListener("login-animation-start", startLoginAnimation);

  // If already loaded, start animation immediately
  if ((window as any).loginAnimationReady) {
    startLoginAnimation();
  }
});

const startLoginAnimation = () => {
  // Step 1: Show logo (sync with loading logo fade out at 700ms)
  setTimeout(() => {
    showLogo.value = true;
  }, 600);

  // Step 2: Show brand name and features
  setTimeout(() => {
    showBrandName.value = true;
  }, 900);

  // Step 3: Fade in login form
  setTimeout(() => {
    showLoginForm.value = true;
  }, 1200);
};

// Turnstile callback
const onTurnstileCallback = (token: string) => {
  turnstileToken.value = token;
};

// Expose callback to window for Turnstile
(window as any).onTurnstileCallback = onTurnstileCallback;
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
          <!-- Animated Logo from Loading Screen -->
          <div class="brand-logo-container" :class="{ show: showLogo }">
            <img src="/favicon.png" alt="Tirnue Logo" class="brand-logo" />
          </div>

          <!-- Animated Brand Name -->
          <div class="brand-name-container" :class="{ show: showBrandName }">
            <h1 class="brand-title">Tirnue</h1>
            <p class="brand-subtitle">
              An under development panel server
            </p>
          </div>

          <!-- Keep original welcome (hidden initially) -->
          <h1 v-show="false" class="brand-title">
            Welcome to <span class="highlight">Tirnue</span>
          </h1>
          <p v-show="false" class="brand-subtitle">
            An under development panel server
          </p>

          <div class="features-list" :class="{ show: showBrandName }">
            <div class="feature-item">
              <ThunderboltOutlined class="feature-icon" />
              <div class="feature-text">
                <h3>Quick Setup</h3>
                <p>Get your server running fast</p>
              </div>
            </div>
            <div class="feature-item">
              <CloudServerOutlined class="feature-icon" />
              <div class="feature-text">
                <h3>Full Control</h3>
                <p>Manage your game servers with ease</p>
              </div>
            </div>
            <div class="feature-item">
              <RocketOutlined class="feature-icon" />
              <div class="feature-text">
                <h3>Simple & Powerful</h3>
                <p>Everything you need, nothing you don't</p>
              </div>
            </div>
          </div>

          <div v-show="showBrandName" class="brand-footer">
            <div class="version-badge">v2.0.1</div>
          </div>
        </div>
      </div>

      <!-- Right Side - Login Form -->
      <div class="form-section">
        <div class="form-container" :class="{ 'form-visible': showLoginForm }">
          <!-- Login Step 0: Form -->
          <div v-show="loginStep === 0 && showLoginForm" class="form-content">
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

              <!-- Cloudflare Turnstile Widget -->
              <div class="turnstile-container">
                <div
                  class="cf-turnstile"
                  data-sitekey="0x4AAAAAACCDkhLA6W9H8wEW"
                  data-callback="onTurnstileCallback"
                  data-theme="dark"
                ></div>
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

              <div class="auth-links">
                <router-link to="/forgot-password" class="auth-link">Forgot password?</router-link>
                <span class="auth-divider">|</span>
                <router-link to="/register" class="auth-link">Create account</router-link>
              </div>
            </form>
          </div>

          <!-- Login Step 1: Loading -->
          <div v-show="loginStep === 1" class="status-screen" :class="{ show: loginStep === 1 }">
            <LoadingOutlined class="status-icon loading-icon" />
            <h3>Authenticating...</h3>
            <p>Please wait while we verify your credentials</p>
          </div>

          <!-- Login Step 2+: Success -->
          <div v-show="loginStep >= 2" class="status-screen" :class="{ show: loginStep >= 2 }">
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
  background: #0a0a0a;
}

// Animated Background - Simplified and optimized
.background-gradient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.25;
  will-change: opacity;
  transition: opacity 2s ease;

  &.orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #FF8C42, transparent);
    top: -10%;
    left: -10%;
  }

  &.orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #D4AF37, transparent);
    bottom: -10%;
    right: -10%;
  }

  &.orb-3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, #FF6B35, transparent);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
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
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 140, 66, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

// Brand Section (Left)
.brand-section {
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.08) 0%, rgba(212, 175, 55, 0.08) 100%);
  padding: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.brand-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 500px;
}

// Animated Logo Container - Smooth fade and scale
.brand-logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &.show {
    opacity: 1;
    transform: scale(1);
  }
}

.brand-logo {
  width: 120px;
  height: 120px;
  filter: drop-shadow(0 10px 25px rgba(255, 140, 66, 0.3));
}

// Animated Brand Name - Smooth fade and slide
.brand-name-container {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
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
  box-shadow: 0 10px 25px rgba(255, 140, 66, 0.25);
}

.brand-title {
  font-size: 56px;
  font-weight: 800;
  background: linear-gradient(135deg, #FF8C42, #D4AF37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px 0;
  line-height: 1.2;
  letter-spacing: 2px;

  .highlight {
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.brand-subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 48px;
  font-weight: 400;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 48px;
  margin-top: 48px;
  opacity: 0;
  transform: translateY(15px);
  transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s, transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s;

  &.show {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: rgba(10, 10, 10, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(255, 140, 66, 0.15);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(20, 20, 20, 0.8);
    transform: translateX(8px);
    border-color: rgba(255, 140, 66, 0.4);
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
  background: linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
  padding: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgba(255, 140, 66, 0.2);
}

.form-container {
  width: 100%;
  max-width: 420px;
  opacity: 0;
  transform: translateX(30px);
  transition: opacity 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &.form-visible {
    opacity: 1;
    transform: translateX(0);
  }
}

.form-content {
  opacity: 1;
  filter: blur(0);
}

.form-header {
  margin-bottom: 40px;
  text-align: center;

  h2 {
    font-size: 36px;
    font-weight: 800;
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);
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
    color: rgba(255, 255, 255, 0.9);
  }
}

.modern-input {
  :deep(.ant-input),
  :deep(.ant-input-password),
  :deep(.ant-input-affix-wrapper) {
    font-size: 16px !important;
    padding: 12px 16px !important;
    border: 2px solid rgba(255, 140, 66, 0.25) !important;
    border-radius: 12px !important;
    background: rgba(10, 10, 10, 0.7) !important;
    color: white !important;
    transition: all 0.3s ease !important;
    height: auto !important;
    line-height: 1.5 !important;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35) !important;
    }

    &:hover {
      border-color: rgba(255, 140, 66, 0.5) !important;
      background: rgba(15, 15, 15, 0.8) !important;
    }

    &:focus, &:focus-within {
      border-color: #FF8C42 !important;
      background: rgba(20, 20, 20, 0.9) !important;
      box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.15) !important;
    }
  }

  :deep(.ant-input-prefix) {
    margin-right: 12px;
  }

  :deep(.ant-input-suffix) {
    margin-left: 12px;
  }

  :deep(.ant-input-password-icon) {
    color: rgba(255, 140, 66, 0.6) !important;

    &:hover {
      color: #FF8C42 !important;
    }
  }
}

.input-icon {
  color: rgba(255, 140, 66, 0.8);
  font-size: 18px;
}

.turnstile-container {
  display: flex;
  justify-content: center;
  margin-top: 8px;
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
  border: 2px solid rgba(255, 140, 66, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;

  &:hover {
    border-color: #FF8C42;
    background: rgba(255, 140, 66, 0.1);
    color: #FF8C42;
  }
}

.auth-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  font-size: 14px;
}

.auth-link {
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.3s ease;

  &:hover {
    color: #FF8C42;
  }
}

.auth-divider {
  color: rgba(255, 255, 255, 0.3);
}

// Status Screens
.status-screen {
  text-align: center;
  padding: 60px 20px;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

  &.show {
    opacity: 1;
    transform: scale(1);
  }

  .status-icon {
    font-size: 80px;
    margin-bottom: 24px;
  }

  .loading-icon {
    color: #FF8C42;
  }

  .success-icon {
    color: #D4AF37;
  }

  h3 {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #FF8C42, #D4AF37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
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

// Landscape mode fixes
@media (max-height: 600px) and (orientation: landscape) {
  .modern-login-page {
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .login-container {
    height: auto;
    min-height: 100vh;
    max-height: none;
  }

  .form-section {
    padding: 20px;
    overflow-y: auto;
  }

  .form-header {
    margin-bottom: 20px;

    h2 {
      font-size: 24px;
    }

    p {
      font-size: 14px;
    }
  }

  .login-form {
    gap: 16px;
  }

  .form-inputs {
    gap: 16px;
  }

  .input-group {
    gap: 4px;

    label {
      font-size: 12px;
    }
  }

  .modern-input {
    :deep(.ant-input),
    :deep(.ant-input-password),
    :deep(.ant-input-affix-wrapper) {
      padding: 8px 12px !important;
      font-size: 14px !important;
    }
  }

  .form-actions {
    margin-top: 12px;
    gap: 8px;
  }

  .login-button {
    height: 44px;
    font-size: 14px;
  }

  .secondary-button {
    height: 40px;
    font-size: 14px;
  }

  .status-screen {
    padding: 30px 20px;

    .status-icon {
      font-size: 50px;
      margin-bottom: 16px;
    }

    h3 {
      font-size: 20px;
    }

    p {
      font-size: 14px;
    }
  }
}

// Override autofill styles - prevent white background
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active) {
  -webkit-text-fill-color: white !important;
  -webkit-box-shadow: 0 0 0px 1000px rgba(10, 10, 10, 0.9) inset !important;
  box-shadow: 0 0 0px 1000px rgba(10, 10, 10, 0.9) inset !important;
  background-color: rgba(10, 10, 10, 0.9) !important;
  background-clip: content-box !important;
  caret-color: white !important;
  transition: background-color 5000s ease-in-out 0s, color 5000s ease-in-out 0s;
}

// Also target autofill with specific selections
:deep(input:-webkit-autofill::first-line) {
  color: white !important;
}
</style>
