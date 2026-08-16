<script setup lang="ts">
import { router } from "@/config/router";
import { reportErrorMsg } from "@/tools/validator";
import logo from "@/assets/logo.png";
import {
  CheckCircleOutlined,
  LoadingOutlined,
  MailOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  KeyOutlined
} from "@ant-design/icons-vue";
import { ref, computed, onUnmounted } from "vue";
import axios from "axios";

// Form data
const email = ref("");
const otp = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

// UI State
const currentStep = ref(0); // 0: email, 1: OTP + new password, 2: success
const isLoading = ref(false);
const countdown = ref(0);
let countdownInterval: any = null;

// Password strength
const passwordStrength = computed(() => {
  const pwd = newPassword.value;
  if (!pwd) return { score: 0, label: "", color: "" };

  let score = 0;
  if (pwd.length >= 9) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score: 25, label: "Weak", color: "#ff4d4f" };
  if (score <= 4) return { score: 50, label: "Fair", color: "#faad14" };
  if (score <= 5) return { score: 75, label: "Good", color: "#ffffff" };
  return { score: 100, label: "Strong", color: "#ffffff" };
});

// Validation
const isPasswordValid = computed(() => {
  return (
    newPassword.value.length >= 9 &&
    newPassword.value === confirmPassword.value &&
    /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(newPassword.value)
  );
});

// API calls
const sendResetCode = async () => {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    reportErrorMsg({ message: "Please enter a valid email address" });
    return;
  }

  isLoading.value = true;
  try {
    const response = await axios.post("./api/auth/password/forgot", {
      email: email.value
    });

    const result = response.data.data || response.data;

    if (result.success !== false) {
      currentStep.value = 1;
      startCountdown();
    } else {
      reportErrorMsg({ message: result.message || "Failed to send reset code" });
    }
  } catch (error: any) {
    const errorData = error.response?.data?.data || error.response?.data;
    reportErrorMsg({ message: errorData?.message || "Failed to send reset code" });
  } finally {
    isLoading.value = false;
  }
};

const resetPassword = async () => {
  if (otp.value.length !== 6) {
    reportErrorMsg({ message: "Please enter the 6-digit code" });
    return;
  }

  if (!isPasswordValid.value) {
    reportErrorMsg({ message: "Please enter a valid password" });
    return;
  }

  isLoading.value = true;
  try {
    const response = await axios.post("./api/auth/password/reset", {
      email: email.value,
      otp: otp.value,
      newPassword: newPassword.value
    });

    const result = response.data.data || response.data;

    if (result.success !== false) {
      currentStep.value = 2;
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      reportErrorMsg({ message: result.message || "Failed to reset password" });
    }
  } catch (error: any) {
    const errorData = error.response?.data?.data || error.response?.data;
    reportErrorMsg({ message: errorData?.message || "Failed to reset password" });
  } finally {
    isLoading.value = false;
  }
};

const resendCode = async () => {
  if (countdown.value > 0) return;
  await sendResetCode();
};

const startCountdown = () => {
  countdown.value = 60;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
};

// OTP input handling
const handleOTPInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  otp.value = input.value.replace(/\D/g, "").slice(0, 6);
};

// Cleanup on unmount
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});
</script>

<template>
  <div class="forgot-password-page">
    <!-- Ambient Background -->
    <div class="background-ambient">
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
    </div>

    <!-- Main Card -->
    <div class="forgot-container">
      <div class="form-section">
        <!-- Top Bar with Back Link & Brand Logo -->
        <div class="top-bar">
          <router-link to="/login" class="back-link">
            <ArrowLeftOutlined /> <span>Back to login</span>
          </router-link>
          <img :src="logo" alt="Logo" class="brand-logo" />
        </div>

        <!-- Step 0: Email Input -->
        <div v-show="currentStep === 0" class="form-content">
          <div class="form-header">
            <div class="header-icon-wrapper">
              <KeyOutlined class="header-icon" />
            </div>
            <h2>Forgot Password?</h2>
            <p>Enter your account email to receive a password reset verification code.</p>
          </div>

          <form @submit.prevent="sendResetCode" class="reset-form">
            <div class="input-group">
              <label>Email Address</label>
              <a-input
                v-model:value="email"
                size="large"
                type="email"
                placeholder="your.email@example.com"
                class="modern-input"
                @press-enter="sendResetCode"
              >
                <template #prefix>
                  <MailOutlined class="input-icon" />
                </template>
              </a-input>
            </div>

            <a-button
              type="primary"
              size="large"
              block
              class="submit-button"
              :loading="isLoading"
              @click="sendResetCode"
            >
              Send Reset Code
            </a-button>
          </form>
        </div>

        <!-- Step 1: OTP + New Password -->
        <div v-show="currentStep === 1" class="form-content">
          <div class="form-header">
            <h2>Verify & Reset</h2>
            <p>
              We've sent a 6-digit verification code to<br />
              <strong class="email-highlight">{{ email }}</strong>
            </p>
          </div>

          <form @submit.prevent="resetPassword" class="reset-form">
            <div class="input-group">
              <label>Verification Code</label>
              <input
                type="text"
                class="otp-input"
                :value="otp"
                @input="handleOTPInput"
                placeholder="000000"
                maxlength="6"
                autocomplete="one-time-code"
              />
            </div>

            <div class="input-group">
              <label>New Password</label>
              <a-input-password
                v-model:value="newPassword"
                size="large"
                placeholder="Create a strong password"
                class="modern-input"
              >
                <template #prefix>
                  <LockOutlined class="input-icon" />
                </template>
              </a-input-password>
              <div v-if="newPassword" class="password-strength">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :style="{ width: passwordStrength.score + '%', background: passwordStrength.color }"
                  ></div>
                </div>
                <span :style="{ color: passwordStrength.color }">{{ passwordStrength.label }}</span>
              </div>
            </div>

            <div class="input-group">
              <label>Confirm Password</label>
              <a-input-password
                v-model:value="confirmPassword"
                size="large"
                placeholder="Confirm your password"
                class="modern-input"
                @press-enter="resetPassword"
              >
                <template #prefix>
                  <LockOutlined class="input-icon" />
                </template>
              </a-input-password>
              <div
                v-if="confirmPassword && newPassword !== confirmPassword"
                class="error-text"
              >
                Passwords do not match
              </div>
            </div>

            <a-button
              type="primary"
              size="large"
              block
              class="submit-button"
              :loading="isLoading"
              :disabled="otp.length !== 6 || !isPasswordValid"
              @click="resetPassword"
            >
              Reset Password
            </a-button>

            <div class="resend-section">
              <span v-if="countdown > 0" class="countdown-text">Resend code in {{ countdown }}s</span>
              <a v-else @click="resendCode" class="resend-link">Resend code</a>
            </div>

            <a @click="currentStep = 0" class="change-email-link">Change email address</a>
          </form>
        </div>

        <!-- Step 2: Success -->
        <div v-show="currentStep === 2" class="form-content success-step">
          <div class="success-icon-container">
            <CheckCircleOutlined class="success-icon" />
          </div>
          <h2>Password Reset!</h2>
          <p>Your password has been successfully updated.</p>
          <p class="redirect-text">
            <LoadingOutlined /> Redirecting to login...
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.forgot-password-page {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #080808;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.background-ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.12;

  &.orb-1 {
    width: 550px;
    height: 550px;
    background: #ffffff;
    top: -15%;
    left: -15%;
  }

  &.orb-2 {
    width: 450px;
    height: 450px;
    background: #ffffff;
    bottom: -15%;
    right: -15%;
  }
}

.forgot-container {
  position: relative;
  z-index: 1;
  width: 90%;
  max-width: 460px;
  background: rgba(14, 14, 14, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}

.form-section {
  padding: 36px 32px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: #ffffff;
    transform: translateX(-2px);
  }
}

.brand-logo {
  height: 24px;
  object-fit: contain;
  filter: brightness(1.2);
}

.form-header {
  margin-bottom: 28px;
  text-align: center;

  .header-icon-wrapper {
    width: 52px;
    height: 52px;
    margin: 0 auto 16px auto;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-icon {
    font-size: 24px;
    color: #ffffff;
  }

  h2 {
    font-size: 26px;
    font-weight: 700;
    color: #ffffff !important;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.65);
    margin: 0;
    line-height: 1.5;
  }

  .email-highlight {
    color: #ffffff;
    font-weight: 600;
  }
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.modern-input {
  :deep(.ant-input),
  :deep(.ant-input-password),
  :deep(.ant-input-affix-wrapper),
  :deep(input) {
    font-size: 14px !important;
    padding: 10px 14px !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: 10px !important;
    background: #141414 !important;
    color: #ffffff !important;
    transition: all 0.2s ease !important;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35) !important;
    }

    &:hover {
      border-color: rgba(255, 255, 255, 0.3) !important;
      background: #1a1a1a !important;
    }

    &:focus,
    &:focus-within,
    &:active {
      border-color: #ffffff !important;
      background: #1a1a1a !important;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15) !important;
      color: #ffffff !important;
    }
  }
}

.input-icon {
  color: rgba(255, 255, 255, 0.4);
  font-size: 15px;
}

.otp-input {
  width: 100%;
  padding: 14px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 12px;
  text-align: center;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: #ffffff !important;
  font-family: monospace;

  &::placeholder {
    color: rgba(255, 255, 255, 0.3) !important;
    letter-spacing: 12px;
  }

  &:focus {
    outline: none;
    border-color: #ffffff;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
  }
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;

  .strength-bar {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;

    .strength-fill {
      height: 100%;
      transition: all 0.3s;
      border-radius: 2px;
    }
  }

  span {
    font-size: 11px;
    font-weight: 600;
  }
}

.error-text {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 2px;
}

.submit-button {
  height: 44px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 10px;
  background: #ffffff !important;
  color: #000000 !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.15);
  margin-top: 6px;
  transition: all 0.2s ease !important;

  &:hover:not(:disabled) {
    background: #e6e6e6 !important;
    color: #000000 !important;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(255, 255, 255, 0.25);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.15) !important;
    color: rgba(255, 255, 255, 0.35) !important;
    cursor: not-allowed;
    box-shadow: none;
  }
}

.resend-section {
  text-align: center;
  font-size: 13px;
}

.countdown-text {
  color: rgba(255, 255, 255, 0.5);
}

.resend-link {
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    color: rgba(255, 255, 255, 0.8);
  }
}

.change-email-link {
  display: block;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #ffffff;
  }
}

// Success Step
.success-step {
  text-align: center;
  padding: 32px 0 16px 0;

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff !important;
    margin: 0 0 8px 0;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 16px 0;
    font-size: 14px;
  }
}

.success-icon-container {
  margin-bottom: 20px;

  .success-icon {
    font-size: 56px;
    color: #ffffff;
  }
}

.redirect-text {
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 13px;
}

// Responsive
@media (max-width: 480px) {
  .form-section {
    padding: 28px 20px;
  }
}

// Autofill fix
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus),
:deep(input:-webkit-autofill:active) {
  -webkit-text-fill-color: #ffffff !important;
  -webkit-box-shadow: 0 0 0px 1000px #141414 inset !important;
  transition: background-color 5000s ease-in-out 0s !important;
  caret-color: #ffffff !important;
}
</style>
