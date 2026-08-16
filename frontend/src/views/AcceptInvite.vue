<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TeamOutlined
} from "@ant-design/icons-vue";
import SleekLoading from "@/components/SleekLoading.vue";
import { verifyInvite, acceptInviteRegister } from "@/services/apis";
import CardPanel from "@/components/CardPanel.vue";
import { PASSWORD_REGEX } from "@/tools/validator";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const submitting = ref(false);
const inviteValid = ref(false);
const inviteEmail = ref("");
const hasAccount = ref(false);
const parentName = ref("");
const errorMessage = ref("");

const formData = ref({
  userName: "",
  passWord: "",
  confirmPassword: ""
});

const formErrors = ref({
  userName: "",
  passWord: "",
  confirmPassword: ""
});

onMounted(async () => {
  const token = route.query.token as string;

  if (!token) {
    errorMessage.value = "No invitation token provided";
    loading.value = false;
    return;
  }

  try {
    const { execute } = verifyInvite();
    const result = await execute({
      params: { token }
    });

    if (result.value?.valid) {
      inviteValid.value = true;
      inviteEmail.value = result.value.email || "";
      hasAccount.value = result.value.hasAccount || false;
      parentName.value = result.value.parentName || "";
    } else {
      errorMessage.value = result.value?.message || "Invalid or expired invitation";
    }
  } catch (error: any) {
    errorMessage.value = error.message || "Failed to verify invitation";
  } finally {
    loading.value = false;
  }
});

const validateForm = (): boolean => {
  let valid = true;
  formErrors.value = { userName: "", passWord: "", confirmPassword: "" };

  if (!formData.value.userName || formData.value.userName.length < 3) {
    formErrors.value.userName = "Username must be at least 3 characters";
    valid = false;
  }

  if (!formData.value.passWord || !PASSWORD_REGEX.test(formData.value.passWord)) {
    formErrors.value.passWord = "Password must be 9-36 characters with uppercase, lowercase, and numbers";
    valid = false;
  }

  if (formData.value.passWord !== formData.value.confirmPassword) {
    formErrors.value.confirmPassword = "Passwords do not match";
    valid = false;
  }

  return valid;
};

const handleRegister = async () => {
  if (!validateForm()) return;

  const token = route.query.token as string;
  submitting.value = true;

  try {
    const { execute } = acceptInviteRegister();
    await execute({
      data: {
        token,
        userName: formData.value.userName,
        passWord: formData.value.passWord
      }
    });

    message.success("Account created successfully! Please log in.");
    router.push("/login");
  } catch (error: any) {
    message.error(error.message || "Registration failed");
  } finally {
    submitting.value = false;
  }
};

const goToLogin = () => {
  router.push("/login");
};
</script>

<template>
  <div class="accept-invite-page">
    <div class="invite-container">
      <CardPanel>
        <template #body>
          <!-- Loading State -->
          <div v-if="loading" class="invite-loading">
            <SleekLoading size="md" style="margin-bottom: 16px" />
            <p>Verifying invitation...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="!inviteValid" class="invite-error">
            <CloseCircleOutlined class="error-icon" />
            <h2>Invitation Invalid</h2>
            <p>{{ errorMessage }}</p>
            <button class="btn-primary" @click="goToLogin">Go to Login</button>
          </div>

          <!-- Has Account - Prompt to Login -->
          <div v-else-if="hasAccount" class="invite-login">
            <CheckCircleOutlined class="success-icon" />
            <h2>Welcome Back!</h2>
            <p class="invite-info">
              <strong>{{ parentName }}</strong> has invited you to access their instance.
            </p>
            <p>
              You already have an account with email <strong>{{ inviteEmail }}</strong>.
              Please log in to accept this invitation.
            </p>
            <button class="btn-primary" @click="goToLogin">
              Log In to Accept
            </button>
          </div>

          <!-- No Account - Registration Form -->
          <div v-else class="invite-register">
            <div class="invite-header">
              <TeamOutlined class="invite-icon" />
              <h2>Accept Invitation</h2>
              <p class="invite-info">
                <strong>{{ parentName }}</strong> has invited you to access their instance.
              </p>
            </div>

            <div class="email-display">
              <MailOutlined />
              <span>{{ inviteEmail }}</span>
            </div>

            <form @submit.prevent="handleRegister" class="register-form">
              <div class="form-group">
                <label>Username</label>
                <div class="input-wrapper">
                  <UserOutlined class="input-icon" />
                  <input
                    v-model="formData.userName"
                    type="text"
                    placeholder="Choose a username"
                    :class="{ error: formErrors.userName }"
                  />
                </div>
                <span v-if="formErrors.userName" class="error-text">
                  {{ formErrors.userName }}
                </span>
              </div>

              <div class="form-group">
                <label>Password</label>
                <div class="input-wrapper">
                  <LockOutlined class="input-icon" />
                  <input
                    v-model="formData.passWord"
                    type="password"
                    placeholder="Create a password"
                    :class="{ error: formErrors.passWord }"
                  />
                </div>
                <span v-if="formErrors.passWord" class="error-text">
                  {{ formErrors.passWord }}
                </span>
              </div>

              <div class="form-group">
                <label>Confirm Password</label>
                <div class="input-wrapper">
                  <LockOutlined class="input-icon" />
                  <input
                    v-model="formData.confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    :class="{ error: formErrors.confirmPassword }"
                  />
                </div>
                <span v-if="formErrors.confirmPassword" class="error-text">
                  {{ formErrors.confirmPassword }}
                </span>
              </div>

              <button
                type="submit"
                class="btn-primary btn-submit"
                :disabled="submitting"
              >
                {{ submitting ? "Creating Account..." : "Create Account & Accept" }}
              </button>
            </form>

            <div class="login-link">
              Already have an account? <a @click="goToLogin">Log in</a>
            </div>
          </div>
        </template>
      </CardPanel>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.accept-invite-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

.invite-container {
  width: 100%;
  max-width: 480px;
}

.invite-loading {
  text-align: center;
  padding: 60px 20px;

  p {
    margin-top: 20px;
    color: var(--color-text-3);
  }
}

.invite-error {
  text-align: center;
  padding: 40px 20px;

  .error-icon {
    font-size: 64px;
    color: #ff4d4f;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0 0 12px 0;
    color: var(--color-text-1);
  }

  p {
    color: var(--color-text-3);
    margin-bottom: 24px;
  }
}

.invite-login {
  text-align: center;
  padding: 40px 20px;

  .success-icon {
    font-size: 64px;
    color: #52c41a;
    margin-bottom: 20px;
  }

  h2 {
    margin: 0 0 16px 0;
    color: var(--color-text-1);
  }

  p {
    color: var(--color-text-2);
    margin-bottom: 12px;

    &.invite-info {
      background: var(--theme-shadow-hover);
      padding: 12px;
      border-radius: 8px;
      border-left: 3px solid var(--theme-primary-color);
    }
  }

  .btn-primary {
    margin-top: 20px;
  }
}

.invite-register {
  padding: 20px;

  .invite-header {
    text-align: center;
    margin-bottom: 24px;

    .invite-icon {
      font-size: 48px;
      color: var(--theme-primary-color);
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 12px 0;
      color: var(--color-text-1);
    }

    .invite-info {
      background: var(--theme-shadow-hover);
      padding: 12px;
      border-radius: 8px;
      border-left: 3px solid var(--theme-primary-color);
      color: var(--color-text-2);
      font-size: 14px;
    }
  }

  .email-display {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--color-bg-3);
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    color: var(--color-text-2);

    :deep(.anticon) {
      color: var(--theme-primary-color);
    }
  }
}

.register-form {
  .form-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: var(--color-text-1);
      font-size: 14px;
    }

    .input-wrapper {
      position: relative;

      .input-icon {
        position: absolute;
        left: 14px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--color-text-3);
        font-size: 16px;
      }

      input {
        width: 100%;
        padding: 12px 14px 12px 42px;
        border: 2px solid var(--color-border-2);
        border-radius: 8px;
        font-size: 14px;
        background: var(--color-bg-2);
        color: var(--color-text-1);
        transition: all 0.2s ease;

        &:focus {
          outline: none;
          border-color: var(--theme-primary-color);
          box-shadow: 0 0 0 3px var(--theme-shadow-hover);
        }

        &.error {
          border-color: #ff4d4f;
        }

        &::placeholder {
          color: var(--color-text-3);
        }
      }
    }

    .error-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #ff4d4f;
    }
  }
}

.btn-primary {
  width: 100%;
  padding: 14px 24px;
  background: var(--theme-primary-gradient);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--theme-shadow-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-submit {
  margin-top: 8px;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: var(--color-text-3);

  a {
    color: var(--theme-primary-color);
    cursor: pointer;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
