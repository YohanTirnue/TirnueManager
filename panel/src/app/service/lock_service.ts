import { createClient, RedisClientType } from "redis";
import Redlock, { Lock } from "redlock";
import { logger } from "./log";

class DistributedLockService {
  private redis: RedisClientType | null = null;
  private redlock: Redlock | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initRedis();
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

    if (!redisUrl) {
      logger.info("[LockService] Redis not configured, distributed locks disabled");
      return;
    }

    try {
      this.redis = createClient({
        url: redisUrl.startsWith("redis://") ? redisUrl : `redis://${redisUrl}`,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error("[LockService] Redis max retries reached");
              return new Error("Max retries reached");
            }
            return Math.min(retries * 50, 2000);
          }
        }
      });

      this.redis.on("error", (err) => {
        logger.error("[LockService] Redis error:", err.message);
      });

      this.redis.on("connect", () => {
        logger.info("[LockService] Redis connected for distributed locks");
      });

      await this.redis.connect();

      // Initialize Redlock with single Redis instance
      // For production with high availability, use multiple Redis instances
      this.redlock = new Redlock([this.redis], {
        driftFactor: 0.01, // Clock drift factor
        retryCount: 10,    // Retry 10 times if lock acquisition fails
        retryDelay: 200,   // Wait 200ms between retries
        retryJitter: 200,  // Add random jitter to prevent thundering herd
        automaticExtensionThreshold: 500 // Auto-extend if operation takes longer
      });

      this.redlock.on("error", (error) => {
        // Ignore "Unable to acquire lock" errors - they're expected
        if (error.message.includes("Unable to acquire")) {
          return;
        }
        logger.error("[LockService] Redlock error:", error.message);
      });

      this.initialized = true;
      logger.info("[LockService] Distributed lock service initialized");

    } catch (error: any) {
      logger.error("[LockService] Failed to initialize:", error.message);
    }
  }

  /**
   * Execute a callback while holding a distributed lock
   * Falls back to no locking if Redis is not available
   */
  async withLock<T>(
    resource: string,
    ttlMs: number,
    callback: () => Promise<T>
  ): Promise<T> {
    if (!this.initialized || !this.redlock) {
      // No Redis - execute without lock (single instance mode)
      logger.debug(`[LockService] Executing without lock: ${resource}`);
      return await callback();
    }

    const lockKey = `lock:${resource}`;
    let lock: Lock | null = null;

    try {
      // Acquire lock
      lock = await this.redlock.acquire([lockKey], ttlMs);
      logger.debug(`[LockService] Lock acquired: ${resource}`);

      // Execute callback
      const result = await callback();

      return result;

    } catch (error: any) {
      if (error.name === "ExecutionError") {
        // Failed to acquire lock
        logger.warn(`[LockService] Failed to acquire lock: ${resource}`);
        throw new Error(`Resource is busy, please try again: ${resource}`);
      }
      throw error;

    } finally {
      // Release lock
      if (lock) {
        try {
          await lock.release();
          logger.debug(`[LockService] Lock released: ${resource}`);
        } catch (error: any) {
          logger.error(`[LockService] Failed to release lock: ${error.message}`);
        }
      }
    }
  }

  /**
   * Check if distributed locking is available
   */
  isAvailable(): boolean {
    return this.initialized && this.redlock !== null;
  }
}

export const lockService = new DistributedLockService();
