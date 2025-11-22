<script setup lang="ts">
import { router } from "@/config/router";
import { reportErrorMsg } from "@/tools/validator";
import {
  CheckCircleOutlined,
  LoadingOutlined,
  MailOutlined,
  LockOutlined,
  ArrowLeftOutlined
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
  if (score <= 5) return { score: 75, label: "Good", color: "#52c41a" };
  return { score: 100, label: "Strong", color: "#52c41a" };
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

    if (response.data.success) {
      currentStep.value = 1;
      startCountdown();
    } else {
      reportErrorMsg({ message: response.data.message || "Failed to send reset code" });
    }
  } catch (error: any) {
    // Still move to next step (don't reveal if email exists)
    currentStep.value = 1;
    startCountdown();
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

    if (response.data.success) {
      currentStep.value = 2;
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      reportErrorMsg({ message: response.data.message || "Failed to reset password" });
    }
  } catch (error: any) {
    reportErrorMsg({ message: error.response?.data?.message || "Failed to reset password" });
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
    <!-- Background -->
    <div class="background-gradient">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Main Container -->
    <div class="forgot-container">
      <div class="form-section">
        <div class="form-container">
          <!-- Back to login -->
          <router-link to="/login" class="back-link">
            <ArrowLeftOutlined /> Back to login
          </router-link>

          <!-- Step 0: Email Input -->
          <div v-show="currentStep === 0" class="form-content">
            <div class="form-header">
              <h2>Reset Password</h2>
              <p>Enter your email and we'll send you a reset code</p>
            </div>

            <form @submit.prevent="sendResetCode" class="reset-form">
              <div class="input-group">
                <label>Email Address</label>
                <a-input
                  v-model:value="email"
                  size="large"
                  type="email"
                  placeholder="john@example.com"
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
              <h2>Reset Password</h2>
              <p>
                Enter the code sent to<br />
                <strong>{{ email }}</strong>
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
                <span v-if="countdown > 0">Resend code in {{ countdown }}s</span>
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
            <p>Your password has been successfully reset.</p>
            <p class="redirect-text">
              <LoadingOutlined /> Redirecting to login...
            </p>
          </div>
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
  background: #0a0a0a;
}

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

  &.orb-1 {
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, #ff8c42, transparent);
    top: -10%;
    left: -10%;
  }

  &.orb-2 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, #d4af37, transparent);
    bottom: -10%;
    right: -10%;
  }

  &.orb-3 {
    width: 350px;
    height: 350px;
    background: radial-gradient(circle, #ff6b35, transparent);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
}

.forgot-container {
  position: relative;
  z-index: 1;
  width: 90%;
  max-width: 480px;
  background: rgba(10, 10, 10, 0.85);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 140, 66, 0.2);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.form-section {
  padding: 48px 40px;
}

.form-container {
  width: 100%;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin-bottom: 24px;
  transition: color 0.3s;

  &:hover {
    color: #ff8c42;
  }
}

.form-header {
  margin-bottom: 32px;
  text-align: center;

  h2 {
    font-size: 32px;
    font-weight: 800;
    background: linear-gradient(135deg, #ff8c42, #d4af37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;

    strong {
      color: #ff8c42;
    }
  }
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
  }
}

.modern-input {
  :deep(.ant-input),
  :deep(.ant-input-password),
  :deep(.ant-input-affix-wrapper) {
    font-size: 14px !important;
    padding: 10px 14px !important;
    border: 2px solid rgba(255, 140, 66, 0.25) !important;
    border-radius: 10px !important;
    background: rgba(10, 10, 10, 0.7) !important;
    color: white !important;
    transition: all 0.3s ease !important;

    &::placeholder {
      color: rgba(255, 255, 255, 0.35) !important;
    }

    &:hover {
      border-color: rgba(255, 140, 66, 0.5) !important;
    }

    &:focus,
    &:focus-within {
      border-color: #ff8c42 !important;
      box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.15) !important;
    }
  }
}

.input-icon {
  color: rgba(255, 140, 66, 0.8);
  font-size: 16px;
}

.otp-input {
  width: 100%;
  padding: 14px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 10px;
  text-align: center;
  background: rgba(10, 10, 10, 0.7);
  border: 2px solid rgba(255, 140, 66, 0.3);
  border-radius: 10px;
  color: #ff8c42;
  font-family: monospace;

  &::placeholder {
    color: rgba(255, 140, 66, 0.2);
    letter-spacing: 10px;
  }

  &:focus {
    outline: none;
    border-color: #ff8c42;
    box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.15);
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
}

.submit-button {
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff8c42, #ff6b35);
  border: none;
  box-shadow: 0 4px 16px rgba(255, 140, 66, 0.3);
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(255, 140, 66, 0.4);
  }

  &:disabled {
    opacity: 0.5;
  }
}

.resend-section {
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.resend-link {
  color: #ff8c42;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.change-email-link {
  display: block;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;

  &:hover {
    color: #ff8c42;
  }
}

// Success Step
.success-step {
  text-align: center;
  padding: 40px 0;

  h2 {
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, #ff8c42, #d4af37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 12px 0;
  }

  p {
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 8px 0;
  }
}

.success-icon-container {
  margin-bottom: 24px;

  .success-icon {
    font-size: 64px;
    color: #52c41a;
  }
}

.redirect-text {
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 14px;
}

// Responsive
@media (max-width: 480px) {
  .form-section {
    padding: 32px 20px;
  }
}

// Autofill fix
:deep(input:-webkit-autofill) {
  -webkit-text-fill-color: white !important;
  -webkit-box-shadow: 0 0 0px 1000px rgba(10, 10, 10, 0.9) inset !important;
  caret-color: white !important;
}
</style>
