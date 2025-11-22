<script setup lang="ts">
import { router } from "@/config/router";
import { useAppStateStore } from "@/stores/useAppStateStore";
import { reportErrorMsg } from "@/tools/validator";
import {
  CheckCircleOutlined,
  LoadingOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined,
  ArrowLeftOutlined
} from "@ant-design/icons-vue";
import { ref, reactive, computed, onUnmounted } from "vue";
import axios from "axios";

const { updateUserInfo } = useAppStateStore();

// Form data
const formData = reactive({
  firstName: "",
  lastName: "",
  email: "",
  location: "",
  password: "",
  confirmPassword: ""
});

const otp = ref("");
const turnstileToken = ref("");

// Location options
const locationOptions = [
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Singapore", label: "Singapore" },
  { value: "Japan", label: "Japan" },
  { value: "Brazil", label: "Brazil" },
  { value: "India", label: "India" },
  { value: "South Korea", label: "South Korea" },
  { value: "Mexico", label: "Mexico" },
  { value: "Spain", label: "Spain" },
  { value: "Italy", label: "Italy" },
  { value: "Poland", label: "Poland" },
  { value: "Sweden", label: "Sweden" },
  { value: "Norway", label: "Norway" },
  { value: "Denmark", label: "Denmark" },
  { value: "Finland", label: "Finland" },
  { value: "Philippines", label: "Philippines" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Thailand", label: "Thailand" },
  { value: "Vietnam", label: "Vietnam" },
  { value: "South Africa", label: "South Africa" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "Ireland", label: "Ireland" },
  { value: "Switzerland", label: "Switzerland" },
  { value: "Austria", label: "Austria" },
  { value: "Belgium", label: "Belgium" },
  { value: "Portugal", label: "Portugal" },
  { value: "Czech Republic", label: "Czech Republic" },
  { value: "Romania", label: "Romania" },
  { value: "Hungary", label: "Hungary" },
  { value: "Greece", label: "Greece" },
  { value: "Argentina", label: "Argentina" },
  { value: "Chile", label: "Chile" },
  { value: "Colombia", label: "Colombia" },
  { value: "Other", label: "Other" }
];

// UI State
const currentStep = ref(0); // 0: form, 1: OTP, 2: success
const isLoading = ref(false);
const countdown = ref(0);
let countdownInterval: any = null;

// Password strength
const passwordStrength = computed(() => {
  const pwd = formData.password;
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
const isFormValid = computed(() => {
  return (
    formData.firstName.trim().length >= 1 &&
    formData.lastName.trim().length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.location.length >= 1 &&
    formData.password.length >= 9 &&
    formData.password === formData.confirmPassword &&
    /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)
  );
});

// API calls
const initiateRegistration = async () => {
  if (!isFormValid.value) {
    reportErrorMsg({ message: "Please fill in all fields correctly" });
    return;
  }

  isLoading.value = true;
  try {
    const response = await axios.post("./api/auth/register/initiate", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      location: formData.location,
      password: formData.password,
      turnstileToken: turnstileToken.value
    });

    if (response.data.success) {
      currentStep.value = 1;
      startCountdown();
    } else {
      reportErrorMsg({ message: response.data.message || "Registration failed" });
    }
  } catch (error: any) {
    reportErrorMsg({ message: error.response?.data?.message || "Registration failed" });
  } finally {
    isLoading.value = false;
  }
};

const verifyOTP = async () => {
  if (otp.value.length !== 6) {
    reportErrorMsg({ message: "Please enter the 6-digit code" });
    return;
  }

  isLoading.value = true;
  try {
    const response = await axios.post("./api/auth/register/verify", {
      email: formData.email,
      otp: otp.value
    });

    if (response.data.success) {
      currentStep.value = 2;
      // Update user info and redirect
      setTimeout(async () => {
        try {
          await updateUserInfo();
        } catch (e) {
          // Continue even if updateUserInfo fails - user is registered
          console.warn("Failed to update user info:", e);
        }
        router.push("/customer");
      }, 2000);
    } else {
      reportErrorMsg({ message: response.data.message || "Verification failed" });
    }
  } catch (error: any) {
    reportErrorMsg({ message: error.response?.data?.message || "Verification failed" });
  } finally {
    isLoading.value = false;
  }
};

const resendOTP = async () => {
  if (countdown.value > 0) return;

  isLoading.value = true;
  try {
    await axios.post("./api/auth/register/resend", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      location: formData.location,
      password: formData.password
    });
    startCountdown();
  } catch (error: any) {
    reportErrorMsg({ message: error.response?.data?.message || "Failed to resend code" });
  } finally {
    isLoading.value = false;
  }
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

// Turnstile callback
const onTurnstileCallback = (token: string) => {
  turnstileToken.value = token;
};
(window as any).onTurnstileRegisterCallback = onTurnstileCallback;

// Cleanup on unmount
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});
</script>

<template>
  <div class="register-page">
    <!-- Background -->
    <div class="background-gradient">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- Main Container -->
    <div class="register-container">
      <!-- Left Side - Branding -->
      <div class="brand-section">
        <div class="brand-content">
          <div class="brand-logo-container">
            <img src="/favicon.png" alt="Tirnue Logo" class="brand-logo" />
          </div>
          <h1 class="brand-title">Tirnue</h1>
          <p class="brand-subtitle">Create your account and start managing your servers</p>

          <div class="features-list">
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>Full server control</span>
            </div>
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>Simple dashboard</span>
            </div>
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>Multiple server types</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side - Form -->
      <div class="form-section">
        <div class="form-container">
          <!-- Back to login -->
          <router-link to="/login" class="back-link">
            <ArrowLeftOutlined /> Back to login
          </router-link>

          <!-- Step 0: Registration Form -->
          <div v-show="currentStep === 0" class="form-content">
            <div class="form-header">
              <h2>Create Account</h2>
              <p>Fill in your details to get started</p>
            </div>

            <form @submit.prevent="initiateRegistration" class="registration-form">
              <div class="form-row">
                <div class="input-group">
                  <label>First Name</label>
                  <a-input
                    v-model:value="formData.firstName"
                    size="large"
                    placeholder="John"
                    class="modern-input"
                  >
                    <template #prefix>
                      <UserOutlined class="input-icon" />
                    </template>
                  </a-input>
                </div>
                <div class="input-group">
                  <label>Last Name</label>
                  <a-input
                    v-model:value="formData.lastName"
                    size="large"
                    placeholder="Doe"
                    class="modern-input"
                  >
                    <template #prefix>
                      <UserOutlined class="input-icon" />
                    </template>
                  </a-input>
                </div>
              </div>

              <div class="input-group">
                <label>Email</label>
                <a-input
                  v-model:value="formData.email"
                  size="large"
                  type="email"
                  placeholder="john@example.com"
                  class="modern-input"
                >
                  <template #prefix>
                    <MailOutlined class="input-icon" />
                  </template>
                </a-input>
              </div>

              <div class="input-group">
                <label>Location</label>
                <a-select
                  v-model:value="formData.location"
                  size="large"
                  placeholder="Select your country"
                  class="modern-select"
                  :options="locationOptions"
                  show-search
                  :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
                >
                </a-select>
              </div>

              <div class="input-group">
                <label>Password</label>
                <a-input-password
                  v-model:value="formData.password"
                  size="large"
                  placeholder="Create a strong password"
                  class="modern-input"
                >
                  <template #prefix>
                    <LockOutlined class="input-icon" />
                  </template>
                </a-input-password>
                <div v-if="formData.password" class="password-strength">
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
                  v-model:value="formData.confirmPassword"
                  size="large"
                  placeholder="Confirm your password"
                  class="modern-input"
                  @press-enter="initiateRegistration"
                >
                  <template #prefix>
                    <LockOutlined class="input-icon" />
                  </template>
                </a-input-password>
                <div
                  v-if="formData.confirmPassword && formData.password !== formData.confirmPassword"
                  class="error-text"
                >
                  Passwords do not match
                </div>
              </div>

              <!-- Turnstile -->
              <div class="turnstile-container">
                <div
                  class="cf-turnstile"
                  data-sitekey="0x4AAAAAACCDkhLA6W9H8wEW"
                  data-callback="onTurnstileRegisterCallback"
                  data-theme="dark"
                ></div>
              </div>

              <a-button
                type="primary"
                size="large"
                block
                class="submit-button"
                :loading="isLoading"
                :disabled="!isFormValid"
                @click="initiateRegistration"
              >
                Create Account
              </a-button>

              <p class="terms-text">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>

          <!-- Step 1: OTP Verification -->
          <div v-show="currentStep === 1" class="form-content otp-step">
            <div class="form-header">
              <h2>Verify Email</h2>
              <p>
                We've sent a 6-digit code to<br />
                <strong>{{ formData.email }}</strong>
              </p>
            </div>

            <div class="otp-input-container">
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

            <a-button
              type="primary"
              size="large"
              block
              class="submit-button"
              :loading="isLoading"
              :disabled="otp.length !== 6"
              @click="verifyOTP"
            >
              Verify
            </a-button>

            <div class="resend-section">
              <span v-if="countdown > 0">Resend code in {{ countdown }}s</span>
              <a v-else @click="resendOTP" class="resend-link">Resend code</a>
            </div>

            <a @click="currentStep = 0" class="change-email-link">Change email address</a>
          </div>

          <!-- Step 2: Success -->
          <div v-show="currentStep === 2" class="form-content success-step">
            <div class="success-icon-container">
              <CheckCircleOutlined class="success-icon" />
            </div>
            <h2>Account Created!</h2>
            <p>Welcome to Tirnue, {{ formData.firstName }}!</p>
            <p class="redirect-text">
              <LoadingOutlined /> Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.register-page {
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

.register-container {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  width: 90%;
  max-width: 1200px;
  height: 90vh;
  max-height: 850px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 140, 66, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}

.brand-section {
  background: linear-gradient(135deg, rgba(255, 140, 66, 0.08) 0%, rgba(212, 175, 55, 0.08) 100%);
  padding: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-content {
  text-align: center;
  max-width: 400px;
}

.brand-logo-container {
  margin-bottom: 24px;
}

.brand-logo {
  width: 100px;
  height: 100px;
  filter: drop-shadow(0 10px 25px rgba(255, 140, 66, 0.3));
}

.brand-title {
  font-size: 48px;
  font-weight: 800;
  color: #ff8c42;
  background: linear-gradient(135deg, #ff8c42, #d4af37);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 16px 0;
}

.brand-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 40px;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;

  .feature-icon {
    color: #ff8c42;
    font-size: 18px;
  }
}

.form-section {
  background: linear-gradient(135deg, rgba(15, 15, 15, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgba(255, 140, 66, 0.2);
  overflow-y: auto;
}

.form-container {
  width: 100%;
  max-width: 480px;
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
    color: #ff8c42;
    background: linear-gradient(135deg, #ff8c42, #d4af37);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }
}

.registration-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

.modern-select {
  :deep(.ant-select-selector) {
    font-size: 14px !important;
    padding: 6px 14px !important;
    height: 44px !important;
    border: 2px solid rgba(255, 140, 66, 0.25) !important;
    border-radius: 10px !important;
    background: rgba(10, 10, 10, 0.7) !important;
    color: white !important;
    transition: all 0.3s ease !important;

    .ant-select-selection-placeholder {
      color: rgba(255, 255, 255, 0.35) !important;
    }

    .ant-select-selection-item {
      color: white !important;
    }
  }

  &:hover :deep(.ant-select-selector) {
    border-color: rgba(255, 140, 66, 0.5) !important;
  }

  &.ant-select-focused :deep(.ant-select-selector) {
    border-color: #ff8c42 !important;
    box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.15) !important;
  }

  :deep(.ant-select-arrow) {
    color: rgba(255, 140, 66, 0.8) !important;
  }
}

.input-icon {
  color: rgba(255, 140, 66, 0.8);
  font-size: 16px;
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

.turnstile-container {
  display: flex;
  justify-content: center;
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

.terms-text {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin: 0;
}

// OTP Step
.otp-step {
  text-align: center;
}

.otp-input-container {
  margin: 32px 0;
}

.otp-input {
  width: 100%;
  max-width: 280px;
  padding: 16px;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 12px;
  text-align: center;
  background: rgba(10, 10, 10, 0.7);
  border: 2px solid rgba(255, 140, 66, 0.3);
  border-radius: 12px;
  color: #ff8c42;
  font-family: monospace;

  &::placeholder {
    color: rgba(255, 140, 66, 0.2);
    letter-spacing: 12px;
  }

  &:focus {
    outline: none;
    border-color: #ff8c42;
    box-shadow: 0 0 0 3px rgba(255, 140, 66, 0.15);
  }
}

.resend-section {
  margin-top: 16px;
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
  margin-top: 16px;
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
@media (max-width: 1024px) {
  .register-container {
    grid-template-columns: 1fr;
    max-width: 500px;
  }

  .brand-section {
    display: none;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 24px 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

// Autofill fix
:deep(input:-webkit-autofill) {
  -webkit-text-fill-color: white !important;
  -webkit-box-shadow: 0 0 0px 1000px rgba(10, 10, 10, 0.9) inset !important;
  caret-color: white !important;
}
</style>
