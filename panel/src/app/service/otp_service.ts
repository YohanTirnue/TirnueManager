import crypto from "crypto";
import { createClient, RedisClientType } from "redis";
import { logger } from "./log";
import { systemConfig } from "../setting";

// Constant-time string comparison to prevent timing attacks
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

interface OTPRecord {
  token: string;
  type: "registration" | "password_reset" | "email_change" | "invitation";
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
  private redis: RedisClientType | null = null;
  private useRedis: boolean = false;
  private redisConnected: boolean = false;

  // Fallback in-memory storage
  private otpStore: Map<string, OTPRecord> = new Map();
  private rateLimitStore: Map<string, number[]> = new Map();

  private defaultConfig: OTPConfig = {
    length: 6,
    expirySeconds: 300, // 5 minutes
    maxAttempts: 3
  };

  constructor() {
    // Initialize Redis if configured
    this.initRedis();

    // Clean up expired OTPs every minute (for in-memory fallback)
    setInterval(() => this.cleanupExpired(), 60000);
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

    if (!redisUrl) {
      logger.info("[OTPService] Redis not configured, using in-memory storage");
      return;
    }

    try {
      this.redis = createClient({
        url: redisUrl.startsWith("redis://") ? redisUrl : `redis://${redisUrl}`,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error("[OTPService] Redis max retries reached, falling back to in-memory");
              return new Error("Max retries reached");
            }
            // Exponential backoff: 50ms, 100ms, 200ms... up to 2s
            return Math.min(retries * 50, 2000);
          }
        }
      });

      this.redis.on("error", (err) => {
        logger.error("[OTPService] Redis error:", err.message);
        this.redisConnected = false;
      });

      this.redis.on("connect", () => {
        logger.info("[OTPService] Redis connected");
        this.redisConnected = true;
        this.useRedis = true;
      });

      this.redis.on("reconnecting", () => {
        logger.warn("[OTPService] Redis reconnecting...");
      });

      await this.redis.connect();

    } catch (error: any) {
      logger.error("[OTPService] Failed to initialize Redis:", error.message);
      logger.info("[OTPService] Falling back to in-memory storage");
    }
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

  private getRedisKey(type: string, email: string): string {
    return `otp:${type}:${email.toLowerCase()}`;
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
    const otp = this.generateOTP();
    const key = this.getRedisKey("registration", email);

    const record: OTPRecord = {
      token: otp,
      type: "registration",
      email,
      metadata: userData,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.defaultConfig.expirySeconds * 1000
    };

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        await this.redis.setEx(
          key,
          this.defaultConfig.expirySeconds,
          JSON.stringify(record)
        );
        logger.info(`[OTPService] Registration OTP created for ${email} (Redis)`);
        return otp;
      } catch (error: any) {
        logger.error("[OTPService] Redis setEx failed, using in-memory:", error.message);
      }
    }

    // Fallback to in-memory
    await this.invalidateOTPs(email, "registration");
    this.otpStore.set(key, record);
    logger.info(`[OTPService] Registration OTP created for ${email} (in-memory)`);
    return otp;
  }

  async createPasswordResetOTP(email: string, userId: string): Promise<string> {
    const otp = this.generateOTP();
    const key = this.getRedisKey("password_reset", email);

    const record: OTPRecord = {
      token: otp,
      type: "password_reset",
      email,
      userId,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.defaultConfig.expirySeconds * 1000
    };

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        await this.redis.setEx(
          key,
          this.defaultConfig.expirySeconds,
          JSON.stringify(record)
        );
        logger.info(`[OTPService] Password reset OTP created for ${email} (Redis)`);
        return otp;
      } catch (error: any) {
        logger.error("[OTPService] Redis setEx failed, using in-memory:", error.message);
      }
    }

    // Fallback to in-memory
    await this.invalidateOTPs(email, "password_reset");
    this.otpStore.set(key, record);
    logger.info(`[OTPService] Password reset OTP created for ${email} (in-memory)`);
    return otp;
  }

  async createEmailChangeOTP(
    email: string,
    userId: string,
    newEmail: string
  ): Promise<string> {
    const otp = this.generateOTP();
    const key = this.getRedisKey("email_change", newEmail);

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

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        // Clear both old and new email OTPs
        await this.redis.del(this.getRedisKey("email_change", email));
        await this.redis.setEx(
          key,
          this.defaultConfig.expirySeconds,
          JSON.stringify(record)
        );
        logger.info(`[OTPService] Email change OTP created for ${newEmail} (Redis)`);
        return otp;
      } catch (error: any) {
        logger.error("[OTPService] Redis setEx failed, using in-memory:", error.message);
      }
    }

    // Fallback to in-memory
    await this.invalidateOTPs(email, "email_change");
    await this.invalidateOTPs(newEmail, "email_change");
    this.otpStore.set(key, record);
    logger.info(`[OTPService] Email change OTP created for ${newEmail} (in-memory)`);
    return otp;
  }

  async createInvitationOTP(email: string, userId: string): Promise<string> {
    const otp = this.generateOTP();
    const key = this.getRedisKey("invitation", email);

    const record: OTPRecord = {
      token: otp,
      type: "invitation",
      email,
      userId,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.defaultConfig.expirySeconds * 1000
    };

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        await this.redis.setEx(
          key,
          this.defaultConfig.expirySeconds,
          JSON.stringify(record)
        );
        logger.info(`[OTPService] Invitation OTP created for ${email} (Redis)`);
        return otp;
      } catch (error: any) {
        logger.error("[OTPService] Redis setEx failed, using in-memory:", error.message);
      }
    }

    // Fallback to in-memory
    await this.invalidateOTPs(email, "invitation");
    this.otpStore.set(key, record);
    logger.info(`[OTPService] Invitation OTP created for ${email} (in-memory)`);
    return otp;
  }

  async verifyOTP(
    email: string,
    otp: string,
    type: "registration" | "password_reset" | "email_change" | "invitation"
  ): Promise<OTPRecord | null> {
    const key = this.getRedisKey(type, email);

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        const data = await this.redis.get(key);
        if (!data) {
          logger.warn(`[OTPService] No OTP found for ${email} (Redis)`);
          return null;
        }

        const record: OTPRecord = JSON.parse(data);

        // Check if OTP matches (constant-time comparison)
        if (safeCompare(record.token, otp)) {
          // Valid OTP - delete it (one-time use)
          await this.redis.del(key);
          logger.info(`[OTPService] OTP verified successfully for ${email} (Redis)`);
          return record;
        }

        // Wrong OTP - increment attempts
        record.attempts++;
        if (record.attempts >= this.defaultConfig.maxAttempts) {
          await this.redis.del(key);
          logger.warn(`[OTPService] Max attempts reached for ${email}, OTP invalidated`);
        } else {
          // Update attempts with remaining TTL
          const ttl = await this.redis.ttl(key);
          if (ttl > 0) {
            await this.redis.setEx(key, ttl, JSON.stringify(record));
          }
        }

        logger.warn(`[OTPService] Invalid OTP attempt for ${email}`);
        return null;
      } catch (error: any) {
        logger.error("[OTPService] Redis verify failed, trying in-memory:", error.message);
      }
    }

    // Fallback to in-memory verification
    for (const [mapKey, record] of this.otpStore.entries()) {
      if (record.email === email && record.type === type) {
        // Check expiry
        if (Date.now() > record.expiresAt) {
          this.otpStore.delete(mapKey);
          logger.info(`[OTPService] OTP expired for ${email}`);
          return null;
        }

        // Check if OTP matches (constant-time comparison)
        if (safeCompare(record.token, otp)) {
          // Valid OTP - delete it (one-time use)
          this.otpStore.delete(mapKey);
          logger.info(`[OTPService] OTP verified successfully for ${email}`);
          return record;
        }

        // Wrong OTP - increment attempts
        record.attempts++;
        if (record.attempts >= this.defaultConfig.maxAttempts) {
          this.otpStore.delete(mapKey);
          logger.warn(`[OTPService] Max attempts reached for ${email}, OTP invalidated`);
        }
      }
    }

    logger.warn(`[OTPService] Invalid OTP attempt for ${email}`);
    return null;
  }

  async hasPendingOTP(
    email: string,
    type: "registration" | "password_reset" | "email_change" | "invitation"
  ): Promise<boolean> {
    const key = this.getRedisKey(type, email);

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        const exists = await this.redis.exists(key);
        return exists === 1;
      } catch (error: any) {
        logger.error("[OTPService] Redis exists check failed:", error.message);
      }
    }

    // Fallback to in-memory
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
    if (this.useRedis && this.redisConnected && this.redis && type) {
      try {
        const key = this.getRedisKey(type, email);
        await this.redis.del(key);
        return;
      } catch (error: any) {
        logger.error("[OTPService] Redis del failed:", error.message);
      }
    }

    // Fallback to in-memory
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
  async checkRateLimit(
    identifier: string,
    maxRequests: number = 3,
    windowMs: number = 3600000
  ): Promise<boolean> {
    const key = `ratelimit:${identifier}`;

    if (this.useRedis && this.redisConnected && this.redis) {
      try {
        const windowSeconds = Math.ceil(windowMs / 1000);
        const current = await this.redis.incr(key);

        if (current === 1) {
          // First request - set expiry
          await this.redis.expire(key, windowSeconds);
        }

        return current <= maxRequests;
      } catch (error: any) {
        logger.error("[OTPService] Redis rate limit check failed:", error.message);
      }
    }

    // Fallback to in-memory
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
    // Only needed for in-memory storage (Redis handles expiry automatically)
    if (this.useRedis && this.redisConnected) {
      return;
    }

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

  // Get storage status for debugging
  getStorageStatus(): { type: "redis" | "memory"; connected: boolean } {
    return {
      type: this.useRedis ? "redis" : "memory",
      connected: this.useRedis ? this.redisConnected : true
    };
  }
}

export const otpService = new OTPService();
