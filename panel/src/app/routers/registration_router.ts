import Koa from "koa";
import Router from "@koa/router";
import bcrypt from "bcryptjs";
import validator from "../middleware/validator";
import permission from "../middleware/permission";
import { emailService } from "../service/email_service";
import { otpService } from "../service/otp_service";
import userSystem from "../service/user_service";
import { logger } from "../service/log";
import { loginSuccess } from "../service/passport_service";
import axios from "axios";
import { ROLE } from "../entity/user";

const router = new Router({ prefix: "/auth" });

// Turnstile verification helper
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!token) return true; // Skip if no token provided
  const secretKey = "0x4AAAAAACCDktwg8qhv003oPlD4yZr09P0";
  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip
      }).toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      }
    );
    return response.data.success === true;
  } catch (error) {
    logger.error("Turnstile verification failed:", error);
    return false;
  }
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// REGISTRATION ENDPOINTS
// ============================================

// POST /api/auth/register/initiate
router.post(
  "/register/initiate",
  permission({ token: false, level: null }),
  validator({
    body: {
      firstName: String,
      lastName: String,
      userName: String,
      email: String,
      country: String,
      region: String,
      city: String,
      password: String
    }
  }),
  async (ctx: Koa.ParameterizedContext) => {
    const { firstName, lastName, userName, email, country, region, city, password, turnstileToken } = ctx.request.body as any;

    // Verify Turnstile
    if (turnstileToken) {
      const isValidTurnstile = await verifyTurnstile(turnstileToken, ctx.ip);
      if (!isValidTurnstile) {
        ctx.status = 400;
        ctx.body = { success: false, message: "Security verification failed" };
        return;
      }
    }

    // Validate email format
    if (!isValidEmail(email)) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Invalid email format" };
      return;
    }

    // Validate names
    if (firstName.trim().length < 1 || firstName.length > 50) {
      ctx.status = 400;
      ctx.body = { success: false, message: "First name must be 1-50 characters" };
      return;
    }
    if (lastName.trim().length < 1 || lastName.length > 50) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Last name must be 1-50 characters" };
      return;
    }

    // Validate username
    if (userName.trim().length < 3 || userName.length > 30) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Username must be 3-30 characters" };
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(userName)) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Username can only contain letters, numbers, underscores, and hyphens" };
      return;
    }

    // Validate location fields
    if (country.trim().length < 2 || country.length > 100) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Please select a valid country" };
      return;
    }
    if (region.trim().length < 1 || region.length > 100) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Region/State is required" };
      return;
    }
    if (city.trim().length < 1 || city.length > 100) {
      ctx.status = 400;
      ctx.body = { success: false, message: "City is required" };
      return;
    }

    // Validate password strength
    if (!userSystem.validatePassword(password)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "Password must be 9-36 characters with uppercase, lowercase, and numbers"
      };
      return;
    }

    // Check if email already exists
    if (userSystem.getUserByEmail(email.toLowerCase())) {
      ctx.status = 409;
      ctx.body = { success: false, message: "Email already registered" };
      return;
    }

    // Check if username already exists
    if (userSystem.existUserName(userName.toLowerCase())) {
      ctx.status = 409;
      ctx.body = { success: false, message: "Username already taken" };
      return;
    }

    // Rate limiting
    if (!otpService.checkRateLimit(`registration:${email}`, 3, 3600000)) {
      ctx.status = 429;
      ctx.body = { success: false, message: "Too many attempts. Please try again later." };
      return;
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Combine location into formatted string
    const location = `${city.trim()}, ${region.trim()}, ${country.trim()}`;

    // Create OTP
    const otp = await otpService.createRegistrationOTP(email.toLowerCase(), {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      userName: userName.trim().toLowerCase(),
      location: location,
      password: hashedPassword
    });

    // Send OTP email
    const emailSent = await emailService.sendOTP(email, otp, "registration", firstName);
    if (!emailSent) {
      ctx.status = 503;
      ctx.body = { success: false, message: "Failed to send verification email. Please try again." };
      return;
    }

    logger.info(`[Registration] OTP sent to ${email}`);

    ctx.body = {
      success: true,
      message: "Verification code sent to your email",
      expiresIn: 300
    };
  }
);

// POST /api/auth/register/verify
router.post(
  "/register/verify",
  permission({ token: false, level: null }),
  validator({ body: { email: String, otp: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { email, otp } = ctx.request.body as any;

    // Verify OTP
    const record = await otpService.verifyOTP(email.toLowerCase(), otp, "registration");
    if (!record || !record.metadata) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Invalid or expired verification code" };
      return;
    }

    // Create user account
    try {
      const user = await userSystem.create({
        userName: record.metadata.userName || email.toLowerCase(),
        passWord: "", // Will be set directly
        permission: ROLE.USER
      });

      // Set additional fields directly
      user.email = email.toLowerCase();
      user.emailVerified = true;
      user.firstName = record.metadata.firstName || "";
      user.lastName = record.metadata.lastName || "";
      user.location = record.metadata.location || "";
      user.passWord = record.metadata.password || "";
      user.createdIp = ctx.ip;
      user.accountStatus = "active";

      // Save user
      const Storage = (await import("../common/storage/sys_storage")).default;
      await Storage.getStorage().store("User", user.uuid, user);

      // Auto-login
      const token = loginSuccess(ctx, user.userName);

      // Send welcome email
      await emailService.sendWelcomeEmail(email, record.metadata.firstName || "User");

      logger.info(`[Registration] New user created: ${email}`);

      ctx.body = {
        success: true,
        message: "Account created successfully",
        user: {
          uuid: user.uuid,
          userName: user.userName,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          location: user.location,
          permission: user.permission,
          token
        }
      };
    } catch (error: any) {
      logger.error("[Registration] Failed to create user:", error);
      ctx.status = 500;
      ctx.body = { success: false, message: "Failed to create account" };
    }
  }
);

// POST /api/auth/register/resend
router.post(
  "/register/resend",
  permission({ token: false, level: null }),
  validator({ body: { email: String, firstName: String, lastName: String, userName: String, country: String, region: String, city: String, password: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { email, firstName, lastName, userName, country, region, city, password } = ctx.request.body as any;

    // Rate limiting
    if (!otpService.checkRateLimit(`resend:${email}`, 3, 3600000)) {
      ctx.status = 429;
      ctx.body = { success: false, message: "Too many attempts. Please try again later." };
      return;
    }

    // Hash password and create new OTP
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Combine location into formatted string
    const location = `${city.trim()}, ${region.trim()}, ${country.trim()}`;

    const otp = await otpService.createRegistrationOTP(email.toLowerCase(), {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      userName: userName.trim().toLowerCase(),
      location: location,
      password: hashedPassword
    });

    // Send OTP email
    const emailSent = await emailService.sendOTP(email, otp, "registration", firstName);
    if (!emailSent) {
      ctx.status = 503;
      ctx.body = { success: false, message: "Failed to send verification email" };
      return;
    }

    ctx.body = {
      success: true,
      message: "Verification code resent to your email"
    };
  }
);

// ============================================
// PASSWORD RECOVERY ENDPOINTS
// ============================================

// POST /api/auth/password/forgot
router.post(
  "/password/forgot",
  permission({ token: false, level: null }),
  validator({ body: { email: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { email } = ctx.request.body as any;

    // Rate limiting
    if (!otpService.checkRateLimit(`forgot:${email}`, 3, 3600000)) {
      ctx.status = 429;
      ctx.body = { success: false, message: "Too many attempts. Please try again later." };
      return;
    }

    // Always return success (don't reveal if email exists)
    const user = userSystem.getUserByEmail(email.toLowerCase());
    if (user) {
      const otp = await otpService.createPasswordResetOTP(email.toLowerCase(), user.uuid);
      await emailService.sendOTP(email, otp, "password_reset", user.firstName);
      logger.info(`[PasswordReset] OTP sent to ${email}`);
    }

    ctx.body = {
      success: true,
      message: "If the email exists, a reset code has been sent"
    };
  }
);

// POST /api/auth/password/reset
router.post(
  "/password/reset",
  permission({ token: false, level: null }),
  validator({ body: { email: String, otp: String, newPassword: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { email, otp, newPassword } = ctx.request.body as any;

    // Validate password strength
    if (!userSystem.validatePassword(newPassword)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: "Password must be 9-36 characters with uppercase, lowercase, and numbers"
      };
      return;
    }

    // Verify OTP
    const record = await otpService.verifyOTP(email.toLowerCase(), otp, "password_reset");
    if (!record || !record.userId) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Invalid or expired verification code" };
      return;
    }

    // Update password
    try {
      await userSystem.edit(record.userId, { passWord: newPassword });

      // Get user for notification
      const user = userSystem.getInstance(record.userId);
      if (user && user.email) {
        await emailService.sendPasswordChangedNotification(user.email);
      }

      logger.info(`[PasswordReset] Password reset for ${email}`);

      ctx.body = {
        success: true,
        message: "Password reset successfully"
      };
    } catch (error: any) {
      logger.error("[PasswordReset] Failed to reset password:", error);
      ctx.status = 500;
      ctx.body = { success: false, message: "Failed to reset password" };
    }
  }
);

// ============================================
// PROFILE EMAIL MANAGEMENT ENDPOINTS
// ============================================

// POST /api/auth/profile/email/initiate
router.post(
  "/profile/email/initiate",
  permission({ level: ROLE.USER }),
  validator({ body: { newEmail: String, password: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { newEmail, password } = ctx.request.body as any;
    const userId = ctx.state.user?.uuid;

    if (!userId) {
      ctx.status = 401;
      ctx.body = { success: false, message: "Unauthorized" };
      return;
    }

    const user = userSystem.getInstance(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { success: false, message: "User not found" };
      return;
    }

    // Verify password
    if (!bcrypt.compareSync(password, user.passWord)) {
      ctx.status = 401;
      ctx.body = { success: false, message: "Invalid password" };
      return;
    }

    // Validate new email
    if (!isValidEmail(newEmail)) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Invalid email format" };
      return;
    }

    // Check if new email already exists
    if (userSystem.getUserByEmail(newEmail.toLowerCase())) {
      ctx.status = 409;
      ctx.body = { success: false, message: "Email already in use" };
      return;
    }

    // Check if email matches an existing username (collision prevention)
    if (userSystem.existUserName(newEmail.toLowerCase())) {
      ctx.status = 409;
      ctx.body = { success: false, message: "Email already in use" };
      return;
    }

    // Create OTP for new email
    const otp = await otpService.createEmailChangeOTP(
      user.email,
      userId,
      newEmail.toLowerCase()
    );

    // Send OTP to new email
    const emailSent = await emailService.sendOTP(newEmail, otp, "email_change", user.firstName);
    if (!emailSent) {
      ctx.status = 503;
      ctx.body = { success: false, message: "Failed to send verification email" };
      return;
    }

    ctx.body = {
      success: true,
      message: "Verification code sent to new email address"
    };
  }
);

// POST /api/auth/profile/email/verify
router.post(
  "/profile/email/verify",
  permission({ level: ROLE.USER }),
  validator({ body: { otp: String, newEmail: String } }),
  async (ctx: Koa.ParameterizedContext) => {
    const { otp, newEmail } = ctx.request.body as any;
    const userId = ctx.state.user?.uuid;

    if (!userId) {
      ctx.status = 401;
      ctx.body = { success: false, message: "Unauthorized" };
      return;
    }

    const user = userSystem.getInstance(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { success: false, message: "User not found" };
      return;
    }

    // Verify OTP for email change
    const record = await otpService.verifyOTP(newEmail.toLowerCase(), otp, "email_change");
    if (!record || record.userId !== userId) {
      ctx.status = 400;
      ctx.body = { success: false, message: "Invalid or expired verification code" };
      return;
    }

    // Update user email
    const oldEmail = user.email;
    user.email = newEmail.toLowerCase();
    user.userName = newEmail.toLowerCase(); // Also update username
    user.emailVerified = true;

    // Save
    const Storage = (await import("../common/storage/sys_storage")).default;
    await Storage.getStorage().store("User", user.uuid, user);

    // Send notification to old email
    if (oldEmail) {
      await emailService.sendEmailChangedNotification(oldEmail, newEmail);
    }

    logger.info(`[EmailChange] Email changed for user ${userId}: ${oldEmail} -> ${newEmail}`);

    ctx.body = {
      success: true,
      message: "Email updated successfully"
    };
  }
);

// GET /api/auth/profile
router.get(
  "/profile",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const userId = ctx.state.user?.uuid;

    if (!userId) {
      ctx.status = 401;
      ctx.body = { success: false, message: "Unauthorized" };
      return;
    }

    const user = userSystem.getInstance(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { success: false, message: "User not found" };
      return;
    }

    ctx.body = {
      success: true,
      user: {
        uuid: user.uuid,
        userName: user.userName,
        email: user.email,
        emailVerified: user.emailVerified,
        firstName: user.firstName,
        lastName: user.lastName,
        location: user.location,
        permission: user.permission,
        registerTime: user.registerTime,
        loginTime: user.loginTime,
        open2FA: user.open2FA
      }
    };
  }
);

// PUT /api/auth/profile/update
router.put(
  "/profile/update",
  permission({ level: ROLE.USER }),
  async (ctx: Koa.ParameterizedContext) => {
    const { firstName, lastName, location } = ctx.request.body as any;
    const userId = ctx.state.user?.uuid;

    if (!userId) {
      ctx.status = 401;
      ctx.body = { success: false, message: "Unauthorized" };
      return;
    }

    const user = userSystem.getInstance(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = { success: false, message: "User not found" };
      return;
    }

    // Update fields
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (location) user.location = location.trim();

    // Save
    const Storage = (await import("../common/storage/sys_storage")).default;
    await Storage.getStorage().store("User", user.uuid, user);

    ctx.body = {
      success: true,
      message: "Profile updated successfully"
    };
  }
);

export default router;
