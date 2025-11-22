import crypto from "crypto";
import { logger } from "./log";

// Constant-time string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

interface OTPRecord {
  token: string;
  type: "registration" | "password_reset" | "email_change";
  email: string;
  userId?: string;
  metadata?: {
    newEmail?: string;
    firstName?: string;
    lastName?: string;
    location?: string;
    password?: string; // Hashed
  };
  attempts: number;
  createdAt: number;
  expiresAt: number;
}

interface OTPConfig {
  length: number;
  expirySeconds: number;
  maxAttempts: number;
}

class OTPService {
  private otpStore: Map<string, OTPRecord> = new Map();
  private rateLimitStore: Map<string, number[]> = new Map();

  private defaultConfig: OTPConfig = {
    length: 6,
    expirySeconds: 300, // 5 minutes
    maxAttempts: 3
  };

  constructor() {
    // Clean up expired OTPs every minute
    setInterval(() => this.cleanupExpired(), 60000);
  }

  private generateOTP(length: number = 6): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length);
      otp += digits[randomIndex];
    }
    return otp;
  }

  private generateKey(type: string, email: string): string {
    return `otp:${type}:${email}:${crypto.randomUUID()}`;
  }

  async createRegistrationOTP(
    email: string,
    userData: {
      firstName: string;
      lastName: string;
      location: string;
      password: string; // Already hashed
    }
  ): Promise<string> {
    // Clear any existing OTPs for this email
    await this.invalidateOTPs(email, "registration");

    const otp = this.generateOTP();
    const key = this.generateKey("registration", email);

    const record: OTPRecord = {
      token: otp,
      type: "registration",
      email,
      metadata: userData,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.defaultConfig.expirySeconds * 1000
    };

    this.otpStore.set(key, record);
    logger.info(`[OTPService] Registration OTP created for ${email}`);

    return otp;
  }

  async createPasswordResetOTP(email: string, userId: string): Promise<string> {
    // Clear any existing OTPs for this email
    await this.invalidateOTPs(email, "password_reset");

    const otp = this.generateOTP();
    const key = this.generateKey("password_reset", email);

    const record: OTPRecord = {
      token: otp,
      type: "password_reset",
      email,
      userId,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.defaultConfig.expirySeconds * 1000
    };

    this.otpStore.set(key, record);
    logger.info(`[OTPService] Password reset OTP created for ${email}`);

    return otp;
  }

  async createEmailChangeOTP(
    email: string,
    userId: string,
    newEmail: string
  ): Promise<string> {
    // Clear any existing OTPs for this user's email change (both old and new email)
    await this.invalidateOTPs(email, "email_change");
    await this.invalidateOTPs(newEmail, "email_change");

    const otp = this.generateOTP();
    const key = this.generateKey("email_change", newEmail);

    const record: OTPRecord = {
      token: otp,
      type: "email_change",
      email: newEmail,
      userId,
      metadata: { newEmail },
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.defaultConfig.expirySeconds * 1000
    };

    this.otpStore.set(key, record);
    logger.info(`[OTPService] Email change OTP created for ${newEmail}`);

    return otp;
  }

  async verifyOTP(
    email: string,
    otp: string,
    type: "registration" | "password_reset" | "email_change"
  ): Promise<OTPRecord | null> {
    for (const [key, record] of this.otpStore.entries()) {
      if (record.email === email && record.type === type) {
        // Check expiry
        if (Date.now() > record.expiresAt) {
          this.otpStore.delete(key);
          logger.info(`[OTPService] OTP expired for ${email}`);
          return null;
        }

        // Check if OTP matches (constant-time comparison)
        if (safeCompare(record.token, otp)) {
          // Valid OTP - delete it (one-time use)
          this.otpStore.delete(key);
          logger.info(`[OTPService] OTP verified successfully for ${email}`);
          return record;
        }

        // Wrong OTP - increment attempts
        record.attempts++;
        if (record.attempts >= this.defaultConfig.maxAttempts) {
          this.otpStore.delete(key);
          logger.warn(`[OTPService] Max attempts reached for ${email}, OTP invalidated`);
        }
      }
    }

    logger.warn(`[OTPService] Invalid OTP attempt for ${email}`);
    return null;
  }

  async hasPendingOTP(
    email: string,
    type: "registration" | "password_reset" | "email_change"
  ): Promise<boolean> {
    for (const record of this.otpStore.values()) {
      if (record.email === email && record.type === type) {
        if (Date.now() <= record.expiresAt) {
          return true;
        }
      }
    }
    return false;
  }

  async invalidateOTPs(email: string, type?: string): Promise<void> {
    const keysToDelete: string[] = [];

    for (const [key, record] of this.otpStore.entries()) {
      if (record.email === email) {
        if (!type || record.type === type) {
          keysToDelete.push(key);
        }
      }
    }

    for (const key of keysToDelete) {
      this.otpStore.delete(key);
    }
  }

  // Rate limiting for OTP requests
  checkRateLimit(identifier: string, maxRequests: number = 3, windowMs: number = 3600000): boolean {
    const now = Date.now();
    const attempts = this.rateLimitStore.get(identifier) || [];
    const recentAttempts = attempts.filter((t) => t > now - windowMs);

    if (recentAttempts.length >= maxRequests) {
      return false;
    }

    recentAttempts.push(now);
    this.rateLimitStore.set(identifier, recentAttempts);
    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.otpStore.entries()) {
      if (now > record.expiresAt) {
        this.otpStore.delete(key);
        cleaned++;
      }
    }

    // Also cleanup old rate limit entries
    for (const [key, attempts] of this.rateLimitStore.entries()) {
      const recent = attempts.filter((t) => t > now - 3600000);
      if (recent.length === 0) {
        this.rateLimitStore.delete(key);
      } else {
        this.rateLimitStore.set(key, recent);
      }
    }

    if (cleaned > 0) {
      logger.debug(`[OTPService] Cleaned up ${cleaned} expired OTPs`);
    }
  }
}

export const otpService = new OTPService();
