<script setup lang="ts">
import { router } from "@/config/router";
import { useRoute } from "vue-router";
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
  UserOutlined
} from "@ant-design/icons-vue";
import SleekLoading from "@/components/SleekLoading.vue";
import { onMounted, reactive, ref } from "vue";

const route = useRoute();

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
  const redirectUrl = route.query.redirect as string;
  if (redirectUrl) {
    router.push(redirectUrl);
    return;
  }
  if (isAdmin.value) {
    router.push({ path: "/" });
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

const onTurnstileCallback = (token: string) => {
  turnstileToken.value = token;
};

(window as any).onTurnstileCallback = onTurnstileCallback;
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Full Card Background GIF -->
      <img src="/logoGif.gif" alt="Background" class="login-bg-gif" />

      <!-- Left Side (Empty, lets the GIF show through) -->
      <div class="login-left">
      </div>

      <!-- Right Side (Form) -->
      <div class="login-right">
        <h1 class="login-title">Sign in</h1>
        <p class="login-desc">Access your panel</p>

        <!-- Login Form -->
        <div v-show="loginStep === 0" class="login-form">
          <div v-if="!is2Fa" class="form-fields">
            <div class="field">
              <a-input
                v-model:value="formData.username"
                size="large"
                name="mcsm-name-input"
                placeholder="Username"
                class="dark-input"
              >
                <template #prefix>
                  <UserOutlined class="field-icon" />
                </template>
              </a-input>
            </div>
            <div class="field">
              <a-input-password
                v-model:value="formData.password"
                size="large"
                name="mcsm-pw-input"
                placeholder="Password"
                class="dark-input"
                @press-enter="handleLogin"
              >
                <template #prefix>
                  <LockOutlined class="field-icon" />
                </template>
              </a-input-password>
            </div>
          </div>

          <div v-else class="form-fields">
            <div class="field">
              <a-input
                v-model:value="formData.code"
                size="large"
                type="text"
                placeholder="2FA Code"
                autocomplete="off"
                name="mcsm-pw-2fa"
                class="dark-input"
                @press-enter="handleLogin"
              >
                <template #prefix>
                  <LockOutlined class="field-icon" />
                </template>
              </a-input>
            </div>
          </div>

          <!-- Turnstile -->
          <div class="turnstile-box">
            <div
              class="cf-turnstile"
              data-sitekey="0x4AAAAAACCDkhLA6W9H8wEW"
              data-callback="onTurnstileCallback"
              data-theme="dark"
            ></div>
          </div>

          <a-button
            type="primary"
            size="large"
            block
            class="sign-in-btn"
            @click="handleLogin"
          >
            Sign In
          </a-button>

          <a-button
            v-if="appConfig.settings.businessMode"
            size="large"
            block
            class="secondary-btn"
            @click="openBuyInstanceDialog"
          >
            {{ t("TXT_CODE_5a408a5e") }}
          </a-button>

          <div class="auth-links">
            <router-link to="/forgot-password">Forgot password?</router-link>
            <span class="sep">|</span>
            <router-link to="/register">Create account</router-link>
          </div>
        </div>

        <!-- Loading -->
        <div v-show="loginStep === 1" class="status-view">
          <SleekLoading size="lg" style="margin-bottom: 20px" />
          <h3>Authenticating...</h3>
        </div>

        <!-- Success -->
        <div v-show="loginStep >= 2" class="status-view">
          <CheckCircleOutlined class="status-icon success" />
          <h3>Login Successful!</h3>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.login-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
}

.login-card {
  position: relative;
  width: 100vw;
  height: 100vh;
  max-width: 100%;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  box-shadow: none;
  border: none;
}

/* GIF Background covers the entire screen */
.login-bg-gif {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.login-left {
  position: relative;
  z-index: 1;
  flex: 1; /* Takes up all remaining space */
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-right {
  position: relative;
  z-index: 1;
  width: 500px; /* Fixed width for the form panel */
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px;
  background: rgba(10, 10, 10, 0.75); /* Dark overlay */
  backdrop-filter: blur(12px); /* Blur effect */
  border-left: 1px solid rgba(255, 255, 255, 0.05);
}

.login-title {
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 8px 0;
  letter-spacing: 1px;
}

.login-desc {
  font-size: 15px;
  color: #aaa;
  margin: 0 0 32px 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-icon {
  color: #666;
  font-size: 16px;
}

.dark-input {
  :deep(.ant-input),
  :deep(.ant-input-password),
  :deep(.ant-input-affix-wrapper),
  :deep(input) {
    font-size: 15px !important;
    padding: 12px 16px !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    background: rgba(0, 0, 0, 0.6) !important;
    color: #ffffff !important;
    transition: all 0.2s ease !important;
    height: auto !important;

    &::placeholder {
      color: #666666 !important;
    }

    &:hover {
      border-color: rgba(255, 255, 255, 0.25) !important;
      background: rgba(0, 0, 0, 0.8) !important;
    }

    &:focus,
    &:focus-within,
    &:active,
    &.ant-input-focused,
    &.ant-input-affix-wrapper-focused {
      border-color: #ffffff !important;
      background: rgba(0, 0, 0, 0.95) !important;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }
  }

  :deep(.ant-input-prefix) {
    margin-right: 12px;
  }

  :deep(.ant-input-suffix) {
    margin-left: 12px;
  }

  :deep(.ant-input-password-icon) {
    color: #666 !important;
    &:hover {
      color: #fff !important;
    }
  }
}

.turnstile-box {
  display: flex;
  justify-content: center;
}

.sign-in-btn {
  height: 48px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 12px;
  background: #ffffff !important;
  color: #000000 !important;
  border: none !important;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.2s;
  margin-top: 8px;

  &:hover {
    background: #e0e0e0 !important;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.secondary-btn {
  height: 46px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: transparent !important;
  color: #999 !important;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3) !important;
    color: #fff !important;
  }
}

.auth-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;

  a {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;

    &:hover {
      color: #ffffff;
      text-decoration: underline;
    }
  }

  .sep {
    color: rgba(255, 255, 255, 0.2);
  }
}

.status-view {
  padding: 40px 0;
  text-align: center;

  .status-icon {
    font-size: 64px;
    margin-bottom: 20px;
    color: #fff;
  }

  .success {
    color: #52c41a;
  }

  h3 {
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 8px 0;
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// Override autofill styles
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active),
:deep(input:-internal-autofill-selected) {
  -webkit-text-fill-color: #ffffff !important;
  -webkit-box-shadow: 0 0 0px 1000px #080808 inset !important;
  box-shadow: 0 0 0px 1000px #080808 inset !important;
  background-color: #080808 !important;
  caret-color: #ffffff !important;
  transition: background-color 50000s ease-in-out 0s !important;
}

// Responsive
@media (max-width: 768px) {
  .login-card {
    flex-direction: column;
    height: auto;
    min-height: 600px;
  }

  .login-left {
    width: 100%;
    height: 200px;
  }

  .login-right {
    width: 100%;
    height: auto;
    padding: 32px 24px;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
}
</style>
