<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  MailOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons-vue";
import axios from "axios";
import { useAppStateStore } from "@/stores/useAppStateStore";

const route = useRoute();
const router = useRouter();
const appStateStore = useAppStateStore();

const token = computed(() => route.params.token as string);
const loading = ref(true);
const submitting = ref(false);
const error = ref("");
const invitationDetails = ref<{
  inviteeEmail: string;
  parentUserName: string;
  instanceName: string;
  expiresAt: number;
  hasAccount: boolean;
} | null>(null);

// Registration form for new users
const formData = ref({
  userName: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: ""
});

// Password requirements
const passwordRequirements = computed(() => {
  const pwd = formData.value.password;
  return {
    minLength: pwd.length >= 9,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd)
  };
});

const isPasswordValid = computed(() => {
  const reqs = passwordRequirements.value;
  return reqs.minLength && reqs.hasUppercase && reqs.hasLowercase && reqs.hasNumber;
});

const isFormValid = computed(() => {
  if (!invitationDetails.value) return false;

  return (
    formData.value.userName.length >= 3 &&
    isPasswordValid.value &&
    formData.value.password === formData.value.confirmPassword &&
    formData.value.firstName.length > 0 &&
    formData.value.lastName.length > 0
  );
});

const isLoggedIn = computed(() => !!appStateStore.state.userInfo?.token);

// Define fetchInvitationDetails before using it in watch
const fetchInvitationDetails = async () => {
  loading.value = true;
  error.value = "";

  console.log("fetchInvitationDetails called with token:", token.value);

  // Safety check - don't call API if token is empty
  if (!token.value) {
    loading.value = false;
    error.value = "Invalid invitation link - no token in URL";
    console.error("Token is empty, cannot fetch invitation details");
    return;
  }

  try {
    const res = await axios.get(`/api/sub-users/invite/verify`, {
      params: { token: token.value }
    });

    console.log("API response:", res.data);

    // Handle both wrapped (res.data.data) and unwrapped (res.data) responses
    const data = res.data.data || res.data;

    invitationDetails.value = {
      inviteeEmail: data.email,
      parentUserName: data.inviterName,
      instanceName: data.instanceName,
      expiresAt: data.expiresAt,
      hasAccount: data.hasAccount
    };

    console.log("Invitation details set:", invitationDetails.value);
  } catch (err: any) {
    console.error("API error:", err);
    error.value = err.response?.data?.data || err.response?.data || "Invitation not found or expired";
  } finally {
    loading.value = false;
  }
};

// Watch for token to be available (route params may not be ready on mount)
watch(token, async (newToken) => {
  console.log("Token watch triggered:", newToken);
  if (newToken) {
    error.value = ""; // Clear any previous error
    await fetchInvitationDetails();
  } else {
    // Token not available - show error
    loading.value = false;
    error.value = "Invalid invitation link - no token provided";
  }
}, { immediate: true });

const handleRegisterAndAccept = async () => {
  if (!isFormValid.value) {
    message.error("Please fill in all required fields correctly");
    return;
  }

  submitting.value = true;
  try {
    await axios.post(`/api/sub-users/invite/accept-register`, {
      token: token.value,
      userName: formData.value.userName,
      password: formData.value.password,
      firstName: formData.value.firstName,
      lastName: formData.value.lastName
    });
    message.success("Account created! You can now log in.");
    router.push("/login");
  } catch (err: any) {
    message.error(err.response?.data?.data || "Failed to register");
  } finally {
    submitting.value = false;
  }
};

const goToLogin = () => {
  // Store the current URL to redirect back after login
  const returnUrl = route.fullPath;
  router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`);
};

// Check if logged-in user's email matches the invitation
const canAcceptDirectly = computed(() => {
  if (!isLoggedIn.value || !invitationDetails.value) return false;
  const userEmail = appStateStore.state.userInfo?.email?.toLowerCase();
  return userEmail === invitationDetails.value.inviteeEmail.toLowerCase();
});

const handleAcceptInvitation = async () => {
  if (!canAcceptDirectly.value) return;

  submitting.value = true;
  try {
    await axios.post(`/api/sub-users/invite/accept`, { token: token.value }, {
      params: { token: appStateStore.state.userInfo?.token }
    });
    message.success("Invitation accepted! You now have access to the instance.");
    router.push("/");
  } catch (err: any) {
    message.error(err.response?.data?.data || "Failed to accept invitation");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="accept-invitation-container">
    <div class="invitation-card">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <LoadingOutlined class="loading-icon" />
        <p>Loading invitation...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <CloseCircleOutlined class="error-icon" />
        <h2>Invitation Error</h2>
        <p>{{ error }}</p>
        <button class="primary-btn" @click="goToLogin">Go to Login</button>
      </div>

      <!-- Invitation Details -->
      <div v-else-if="invitationDetails">
        <div class="invitation-header">
          <div class="header-icon">
            <MailOutlined />
          </div>
          <h1>You've Been Invited!</h1>
          <p class="subtitle">
            <strong>{{ invitationDetails.parentUserName }}</strong> has invited you to access
          </p>
          <p class="instance-name">"{{ invitationDetails.instanceName }}"</p>
        </div>

        <!-- For users who already have an account -->
        <div v-if="invitationDetails.hasAccount" class="existing-user-section">
          <!-- Case 1: Logged in with matching email - can accept directly -->
          <div v-if="canAcceptDirectly" class="accept-section">
            <div class="info-box success">
              <CheckCircleOutlined class="info-icon" />
              <div>
                <p>You're logged in as <strong>{{ invitationDetails.inviteeEmail }}</strong></p>
                <p class="info-note">Click below to accept this invitation and gain access to the instance.</p>
              </div>
            </div>

            <button
              class="primary-btn"
              :disabled="submitting"
              @click="handleAcceptInvitation"
            >
              {{ submitting ? "Accepting..." : "Accept Invitation" }}
            </button>
          </div>

          <!-- Case 2: Logged in but with different email -->
          <div v-else-if="isLoggedIn" class="wrong-account-section">
            <div class="info-box warning">
              <ExclamationCircleOutlined class="info-icon" />
              <div>
                <p>This invitation was sent to <strong>{{ invitationDetails.inviteeEmail }}</strong></p>
                <p class="info-note">You're currently logged in with a different email. Please log out and log in with the correct account to accept this invitation.</p>
              </div>
            </div>

            <button class="secondary-btn" @click="goToLogin">
              Switch Account
            </button>
          </div>

          <!-- Case 3: Not logged in - prompt to log in -->
          <div v-else class="login-prompt-section">
            <div class="info-box">
              <UserOutlined class="info-icon" />
              <div>
                <p>An account exists for <strong>{{ invitationDetails.inviteeEmail }}</strong></p>
                <p class="info-note">Please log in to accept this invitation.</p>
              </div>
            </div>

            <button class="primary-btn" @click="goToLogin">
              Log In to Accept
            </button>
          </div>
        </div>

        <!-- For new users - registration form -->
        <div v-else class="new-user-section">
          <div class="info-box">
            <UserOutlined class="info-icon" />
            <p>Create an account for <strong>{{ invitationDetails.inviteeEmail }}</strong></p>
          </div>

          <form class="registration-form" @submit.prevent="handleRegisterAndAccept">
            <div class="form-row">
              <div class="form-group">
                <label>First Name</label>
                <a-input
                  v-model:value="formData.firstName"
                  placeholder="First name"
                  size="large"
                >
                  <template #prefix>
                    <UserOutlined style="color: rgba(0, 0, 0, 0.25)" />
                  </template>
                </a-input>
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <a-input
                  v-model:value="formData.lastName"
                  placeholder="Last name"
                  size="large"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Username</label>
              <a-input
                v-model:value="formData.userName"
                placeholder="Choose a username"
                size="large"
              >
                <template #prefix>
                  <UserOutlined style="color: rgba(0, 0, 0, 0.25)" />
                </template>
              </a-input>
            </div>

            <div class="form-group">
              <label>Password</label>
              <a-input-password
                v-model:value="formData.password"
                placeholder="Create a password"
                size="large"
              >
                <template #prefix>
                  <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                </template>
              </a-input-password>

              <div class="password-requirements">
                <span :class="{ met: passwordRequirements.minLength }">
                  {{ passwordRequirements.minLength ? "✓" : "○" }} 9+ characters
                </span>
                <span :class="{ met: passwordRequirements.hasUppercase }">
                  {{ passwordRequirements.hasUppercase ? "✓" : "○" }} Uppercase
                </span>
                <span :class="{ met: passwordRequirements.hasLowercase }">
                  {{ passwordRequirements.hasLowercase ? "✓" : "○" }} Lowercase
                </span>
                <span :class="{ met: passwordRequirements.hasNumber }">
                  {{ passwordRequirements.hasNumber ? "✓" : "○" }} Number
                </span>
              </div>
            </div>

            <div class="form-group">
              <label>Confirm Password</label>
              <a-input-password
                v-model:value="formData.confirmPassword"
                placeholder="Confirm your password"
                size="large"
              >
                <template #prefix>
                  <LockOutlined style="color: rgba(0, 0, 0, 0.25)" />
                </template>
              </a-input-password>
              <span
                v-if="formData.confirmPassword && formData.password !== formData.confirmPassword"
                class="error-text"
              >
                Passwords do not match
              </span>
            </div>

            <button
              type="submit"
              class="primary-btn"
              :disabled="!isFormValid || submitting"
            >
              {{ submitting ? "Creating Account..." : "Create Account & Accept" }}
            </button>
          </form>
        </div>

        <div class="expiry-notice">
          This invitation expires at {{ new Date(invitationDetails.expiresAt).toLocaleString() }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.accept-invitation-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
}

.invitation-card {
  width: 100%;
  max-width: 500px;
  background: rgba(20, 20, 20, 0.95);
  border: 1px solid rgba(255, 140, 66, 0.2);
  border-radius: 16px;
  padding: 40px;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 40px 0;
}

.loading-icon {
  font-size: 48px;
  color: #ff8c42;
  margin-bottom: 16px;
}

.error-icon {
  font-size: 48px;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.loading-state p,
.error-state p {
  color: rgba(255, 255, 255, 0.7);
}

.error-state h2 {
  color: white;
  margin: 0 0 8px;
}

.invitation-header {
  text-align: center;
  margin-bottom: 32px;
}

.header-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff8c42 0%, #ff6b1a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: white;
}

.invitation-header h1 {
  color: white;
  font-size: 24px;
  margin: 0 0 8px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 8px;
}

.subtitle strong {
  color: #ff8c42;
}

.instance-name {
  color: white;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 140, 66, 0.1);
  border: 1px solid rgba(255, 140, 66, 0.3);
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-icon {
  font-size: 20px;
  color: #ff8c42;
}

.info-box p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.info-box strong {
  color: #ff8c42;
}

.info-box.warning {
  background: rgba(250, 173, 20, 0.1);
  border-color: rgba(250, 173, 20, 0.3);
  align-items: flex-start;
}

.info-box.warning .info-icon {
  color: #faad14;
}

.info-box.success {
  background: rgba(82, 196, 26, 0.1);
  border-color: rgba(82, 196, 26, 0.3);
  align-items: flex-start;
}

.info-box.success .info-icon {
  color: #52c41a;
}

.secondary-btn {
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  border: 1px solid rgba(255, 140, 66, 0.5);
  border-radius: 8px;
  color: #ff8c42;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.secondary-btn:hover {
  background: rgba(255, 140, 66, 0.1);
  border-color: #ff8c42;
}

.info-note {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 4px !important;
}

.action-section {
  text-align: center;
}

.action-section p {
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
}

.primary-btn {
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #ff8c42 0%, #ff6b1a 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.primary-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 140, 66, 0.4);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.registration-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.password-requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.password-requirements span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.password-requirements span.met {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

.error-text {
  font-size: 12px;
  color: #ff4d4f;
}

.expiry-notice {
  text-align: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 140, 66, 0.1);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 480px) {
  .invitation-card {
    padding: 24px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
