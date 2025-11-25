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
  ArrowLeftOutlined,
  CloseCircleOutlined
} from "@ant-design/icons-vue";
import { ref, reactive, computed, onUnmounted, watch } from "vue";
import axios from "axios";
import { Country, State, City } from "country-state-city";

const { updateUserInfo } = useAppStateStore();

// Form data
const formData = reactive({
  firstName: "",
  lastName: "",
  userName: "",
  email: "",
  country: "",
  region: "",
  city: "",
  password: "",
  confirmPassword: ""
});

const otp = ref("");
const turnstileToken = ref("");

// Location data
const countries = ref(Country.getAllCountries());
const states = ref<any[]>([]);
const cities = ref<any[]>([]);

// Generate dropdown options
const countryOptions = computed(() =>
  countries.value.map((country) => ({
    value: country.isoCode,
    label: country.name
  }))
);

const stateOptions = computed(() =>
  states.value.map((state) => ({
    value: state.isoCode,
    label: state.name
  }))
);

const cityOptions = computed(() =>
  cities.value.map((city) => ({
    value: city.name,
    label: city.name
  }))
);

// Watch for country changes to update states
watch(
  () => formData.country,
  (newCountry) => {
    if (newCountry) {
      states.value = State.getStatesOfCountry(newCountry);
      formData.region = "";
      formData.city = "";
      cities.value = [];
    } else {
      states.value = [];
      cities.value = [];
    }
  }
);

// Watch for state changes to update cities
watch(
  () => formData.region,
  (newState) => {
    if (newState && formData.country) {
      cities.value = City.getCitiesOfState(formData.country, newState);
      formData.city = "";
    } else {
      cities.value = [];
    }
  }
);

// UI State
const currentStep = ref(0); // 0: form, 1: OTP, 2: success
const isLoading = ref(false);
const countdown = ref(0);
let countdownInterval: any = null;

// Password requirements
const passwordRequirements = computed(() => {
  const pwd = formData.password;
  return {
    minLength: pwd.length >= 9,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd)
  };
});

// Validation
const isFormValid = computed(() => {
  return (
    formData.firstName.trim().length >= 1 &&
    formData.lastName.trim().length >= 1 &&
    formData.userName.trim().length >= 3 &&
    /^[a-zA-Z0-9_-]+$/.test(formData.userName) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
    formData.country.length >= 2 &&
    formData.region.trim().length >= 1 &&
    formData.city.trim().length >= 1 &&
    formData.password.length >= 9 &&
    formData.password === formData.confirmPassword &&
    /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)
  );
});

// Helper to get location names
const getLocationNames = () => {
  const selectedCountry = countries.value.find((c) => c.isoCode === formData.country);
  const selectedState = states.value.find((s) => s.isoCode === formData.region);

  return {
    country: selectedCountry?.name || formData.country,
    region: selectedState?.name || formData.region,
    city: formData.city
  };
};

// Cookie helpers for tracking
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

const setCookie = (name: string, value: string, days: number) => {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {
    // Cookie setting failed (blocked or disabled), that's okay
  }
};

const generateTrackingId = (): string => {
  return "tid_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
};

// Collect device fingerprint for alt account detection
const collectFingerprint = async () => {
  // Get or create tracking cookie (persists across sessions)
  let trackingId = getCookie("_tid");
  if (!trackingId) {
    trackingId = generateTrackingId();
    setCookie("_tid", trackingId, 365 * 2); // 2 year expiry
  }

  const fingerprint: any = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: {
      width: window.screen.width,
      height: window.screen.height,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: (navigator as any).deviceMemory || null,
    trackingCookie: trackingId // Add tracking cookie ID
  };

  // Canvas fingerprint
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      canvas.width = 280;
      canvas.height = 60;

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#FF6B6B");
      gradient.addColorStop(0.5, "#4ECDC4");
      gradient.addColorStop(1, "#45B7D1");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(255, 99, 71, 0.8)";
      ctx.fillRect(20, 20, 60, 20);

      const textStrings = ["Canvas 🎨", "Fingerprint", "Test123"];
      const fonts = ["14px Arial", "16px serif", "12px monospace"];

      textStrings.forEach((text, i) => {
        ctx.font = fonts[i] || "14px Arial";
        ctx.fillStyle = `hsl(${i * 60}, 70%, 50%)`;
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2;
        ctx.fillText(text, 10 + i * 15, 25 + i * 8);
      });

      fingerprint.canvasFp = canvas.toDataURL();
    }
  } catch (e) {
    fingerprint.canvasFp = "canvas_blocked";
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      fingerprint.webglFp = {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
      };
    }
  } catch (e) {
    fingerprint.webglFp = null;
  }

  // Audio fingerprint
  try {
    const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();

      oscillator.connect(analyser);
      analyser.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 10000;
      gainNode.gain.value = 0;

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);

      await audioContext.close();
      fingerprint.audioFp = Array.from(frequencyData).slice(0, 30).join(",");
    }
  } catch (e) {
    fingerprint.audioFp = null;
  }

  // Font detection
  try {
    const fonts = [
      "Arial",
      "Helvetica",
      "Times New Roman",
      "Courier",
      "Verdana",
      "Georgia",
      "Palatino",
      "Garamond",
      "Tahoma",
      "Comic Sans MS",
      "Trebuchet MS",
      "Impact"
    ];
    fingerprint.fonts = fonts.filter((font) => {
      const span = document.createElement("span");
      span.style.fontFamily = font;
      span.innerHTML = "test";
      document.body.appendChild(span);
      const width = span.offsetWidth;
      document.body.removeChild(span);
      return width > 0;
    });
  } catch (e) {
    fingerprint.fonts = [];
  }

  // Plugins
  try {
    fingerprint.plugins = Array.from(navigator.plugins).map((p: any) => ({
      name: p.name,
      filename: p.filename
    }));
  } catch (e) {
    fingerprint.plugins = [];
  }

  return fingerprint;
};

// API calls
const initiateRegistration = async () => {
  if (!isFormValid.value) {
    reportErrorMsg({ message: "Please fill in all fields correctly" });
    return;
  }

  isLoading.value = true;
  try {
    const locationNames = getLocationNames();
    const response = await axios.post("./api/auth/register/initiate", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      userName: formData.userName,
      email: formData.email,
      country: locationNames.country,
      region: locationNames.region,
      city: locationNames.city,
      password: formData.password,
      turnstileToken: turnstileToken.value
    });

    const result = response.data.data || response.data;
    if (result.success) {
      currentStep.value = 1;
      startCountdown();
    } else {
      reportErrorMsg({ message: result.message || "Registration failed" });
    }
  } catch (error: any) {
    const errorData = error.response?.data?.data || error.response?.data;
    reportErrorMsg({ message: errorData?.message || "Registration failed" });
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
    const fingerprint = await collectFingerprint();
    const response = await axios.post("./api/auth/register/verify", {
      email: formData.email,
      otp: otp.value,
      fingerprint
    });

    const result = response.data.data || response.data;
    if (result.success) {
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
      reportErrorMsg({ message: result.message || "Verification failed" });
    }
  } catch (error: any) {
    const errorData = error.response?.data?.data || error.response?.data;
    reportErrorMsg({ message: errorData?.message || "Verification failed" });
  } finally {
    isLoading.value = false;
  }
};

const resendOTP = async () => {
  if (countdown.value > 0) return;

  isLoading.value = true;
  try {
    const locationNames = getLocationNames();
    await axios.post("./api/auth/register/resend", {
      firstName: formData.firstName,
      lastName: formData.lastName,
      userName: formData.userName,
      email: formData.email,
      country: locationNames.country,
      region: locationNames.region,
      city: locationNames.city,
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
          <p class="brand-subtitle">Cheap hosting with complete team transparency</p>

          <div class="features-list">
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>Track your developers with audit logs</span>
            </div>
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>Control permissions - see everything they do</span>
            </div>
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>Manage your team with peace of mind</span>
            </div>
            <div class="feature-item">
              <CheckCircleOutlined class="feature-icon" />
              <span>No more wondering what happened</span>
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
                    placeholder="First Name"
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
                    placeholder="Last Name"
                    class="modern-input"
                  >
                    <template #prefix>
                      <UserOutlined class="input-icon" />
                    </template>
                  </a-input>
                </div>
              </div>

              <div class="input-group">
                <label>Username</label>
                <a-input
                  v-model:value="formData.userName"
                  size="large"
                  placeholder="Username"
                  class="modern-input"
                >
                  <template #prefix>
                    <UserOutlined class="input-icon" />
                  </template>
                </a-input>
                <div v-if="formData.userName && !/^[a-zA-Z0-9_-]+$/.test(formData.userName)" class="error-text">
                  Only letters, numbers, underscores, and hyphens allowed
                </div>
                <div v-else-if="formData.userName && formData.userName.length < 3" class="error-text">
                  Username must be at least 3 characters
                </div>
              </div>

              <div class="input-group">
                <label>Email</label>
                <a-input
                  v-model:value="formData.email"
                  size="large"
                  type="email"
                  placeholder="Email"
                  class="modern-input"
                >
                  <template #prefix>
                    <MailOutlined class="input-icon" />
                  </template>
                </a-input>
              </div>

              <div class="input-group">
                <label>Country</label>
                <a-select
                  v-model:value="formData.country"
                  size="large"
                  placeholder="Select your country"
                  class="modern-select"
                  :options="countryOptions"
                  show-search
                  :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
                >
                </a-select>
              </div>

              <div class="form-row">
                <div class="input-group">
                  <label>Region/State</label>
                  <a-select
                    v-model:value="formData.region"
                    size="large"
                    placeholder="Select region/state"
                    class="modern-select"
                    :options="stateOptions"
                    :disabled="!formData.country"
                    show-search
                    :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
                  >
                  </a-select>
                </div>
                <div class="input-group">
                  <label>City</label>
                  <!-- Show dropdown if cities available, otherwise text input -->
                  <a-select
                    v-if="cityOptions.length > 0"
                    v-model:value="formData.city"
                    size="large"
                    placeholder="Select city"
                    class="modern-select"
                    :options="cityOptions"
                    :disabled="!formData.region"
                    show-search
                    :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
                  >
                  </a-select>
                  <a-input
                    v-else
                    v-model:value="formData.city"
                    size="large"
                    placeholder="Enter your city"
                    class="modern-input"
                    :disabled="!formData.region"
                  />
                  <div v-if="cityOptions.length === 0 && formData.region" class="info-text">
                    No cities available in database. Please enter manually.
                  </div>
                </div>
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
                <div v-if="formData.password" class="password-requirements">
                  <div class="requirement" :class="{ met: passwordRequirements.minLength }">
                    <CheckCircleOutlined v-if="passwordRequirements.minLength" class="req-icon met" />
                    <CloseCircleOutlined v-else class="req-icon" />
                    <span>At least 9 characters</span>
                  </div>
                  <div class="requirement" :class="{ met: passwordRequirements.hasUppercase }">
                    <CheckCircleOutlined v-if="passwordRequirements.hasUppercase" class="req-icon met" />
                    <CloseCircleOutlined v-else class="req-icon" />
                    <span>Uppercase letter (A-Z)</span>
                  </div>
                  <div class="requirement" :class="{ met: passwordRequirements.hasLowercase }">
                    <CheckCircleOutlined v-if="passwordRequirements.hasLowercase" class="req-icon met" />
                    <CloseCircleOutlined v-else class="req-icon" />
                    <span>Lowercase letter (a-z)</span>
                  </div>
                  <div class="requirement" :class="{ met: passwordRequirements.hasNumber }">
                    <CheckCircleOutlined v-if="passwordRequirements.hasNumber" class="req-icon met" />
                    <CloseCircleOutlined v-else class="req-icon" />
                    <span>Number (0-9)</span>
                  </div>
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
  overflow: auto;
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
  min-height: 90vh;
  max-height: 850px;
  background: rgba(20, 20, 20, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1px solid rgba(255, 140, 66, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
  margin: 20px 0;
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

.password-requirements {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;

  .requirement {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    transition: color 0.2s;

    &.met {
      color: #52c41a;
    }

    .req-icon {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.3);

      &.met {
        color: #52c41a;
      }
    }
  }
}

.error-text {
  color: #ff4d4f;
  font-size: 12px;
}

.info-text {
  color: rgba(255, 140, 66, 0.8);
  font-size: 12px;
  margin-top: 4px;
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
    min-height: auto;
    max-height: none;
    height: auto;
  }

  .brand-section {
    display: none;
  }

  .form-section {
    overflow-y: visible;
    height: auto;
    min-height: auto;
  }
}

@media (max-width: 480px) {
  .register-page {
    align-items: flex-start;
    padding: 20px 0;
  }

  .register-container {
    width: 95%;
    min-height: auto;
    margin: 0;
  }

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

<style lang="scss">
// Global Light Mode Styles for Register Page
.app-light-theme {
  .register-page {
    background: #f5f5f5;
  }

  .gradient-orb {
    &.orb-1 {
      background: radial-gradient(circle, #ff8c42, transparent);
      opacity: 0.15;
    }

    &.orb-2 {
      background: radial-gradient(circle, #d4af37, transparent);
      opacity: 0.15;
    }

    &.orb-3 {
      background: radial-gradient(circle, #ff6b35, transparent);
      opacity: 0.15;
    }
  }

  .register-container {
    background: rgba(255, 255, 255, 0.98);
    border: 2px solid #333;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  }

  .brand-section {
    background: linear-gradient(135deg, rgba(255, 140, 66, 0.08) 0%, rgba(212, 175, 55, 0.08) 100%);
  }

  .brand-title {
    color: #1a1a1a;
  }

  .brand-subtitle {
    color: #666;
  }

  .form-section {
    background: #fafafa;
    border-left: 1px solid #ddd;
  }

  .form-header {
    h2 {
      color: #1a1a1a;
    }

    p {
      color: #666;
    }
  }

  .progress-steps {
    .step {
      background: #fff;
      border: 2px solid #333;

      &.active {
        background: rgba(255, 140, 0, 0.1);
        border-color: #ff8c00;
      }

      &.completed {
        background: rgba(255, 140, 0, 0.15);
        border-color: #ff8c00;
      }
    }

    .step-number {
      color: #4a4a4a;
    }

    .step.active .step-number,
    .step.completed .step-number {
      color: #ff8c00;
    }

    .step-label {
      color: #666;
    }

    .step.active .step-label {
      color: #1a1a1a;
    }
  }

  .form-label {
    color: #1a1a1a;
  }

  .modern-input {
    input,
    .ant-select-selector,
    .ant-input-affix-wrapper {
      background: white !important;
      border: 2px solid #333 !important;
      color: #1a1a1a !important;

      &::placeholder {
        color: #999 !important;
      }

      &:hover {
        border-color: #666 !important;
        background: #fafafa !important;
      }

      &:focus, &:focus-within {
        border-color: #ff8c00 !important;
        background: white !important;
        box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.15) !important;
      }
    }
  }

  .password-strength {
    background: rgba(255, 140, 0, 0.1);
    border: 1px solid rgba(255, 140, 0, 0.2);
  }

  .password-requirement {
    color: #666;

    &.met {
      color: #ff8c00;
    }
  }

  .form-buttons {
    .ant-btn {
      border: 2px solid #333;
      color: #4a4a4a;
      background: white;

      &:hover {
        border-color: #ff8c00;
        color: #ff8c00;
      }
    }

    .ant-btn-primary {
      background: linear-gradient(135deg, #ff8c00, #ff6b35);
      border: none;
      color: white;

      &:hover {
        background: linear-gradient(135deg, #ffa500, #ff8c00);
      }
    }
  }

  .success-icon,
  .check-icon {
    color: #ff8c00;
  }

  .success-screen,
  .otp-screen {
    h3 {
      color: #1a1a1a;
    }

    p {
      color: #666;
    }
  }
}
</style>
