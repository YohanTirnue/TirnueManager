import { createClient, RedisClientType } from "redis";
import { logger } from "./log";

class IdempotencyService {
  private redis: RedisClientType | null = null;
  private memoryCache: Map<string, { result: any; expiresAt: number }> = new Map();
  private initialized: boolean = false;
  private defaultTTL: number = 86400; // 24 hours in seconds

  constructor() {
    this.initRedis();
    // Clean up expired memory cache entries every minute
    setInterval(() => this.cleanupMemoryCache(), 60000);
  }

  private async initRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

    if (!redisUrl) {
      logger.info("[IdempotencyService] Redis not configured, using in-memory storage");
      return;
    }

    try {
      this.redis = createClient({
        url: redisUrl.startsWith("redis://") ? redisUrl : `redis://${redisUrl}`,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) return false;
            return Math.min(retries * 50, 2000);
          }
        }
      });

      this.redis.on("error", (err) => {
        logger.error("[IdempotencyService] Redis error:", err.message);
      });

      this.redis.on("connect", () => {
        logger.info("[IdempotencyService] Redis connected");
        this.initialized = true;
      });

      await this.redis.connect();

    } catch (error: any) {
      logger.error("[IdempotencyService] Failed to initialize Redis:", error.message);
    }
  }

  /**
   * Process an operation idempotently
   * Returns cached result if the operation was already processed
   */
  async processIdempotent<T>(
    idempotencyKey: string,
    operation: () => Promise<T>,
    ttlSeconds: number = this.defaultTTL
  ): Promise<{ result: T; cached: boolean }> {
    const key = `idempotency:${idempotencyKey}`;

    // Check if already processed
    const cached = await this.get(key);
    if (cached !== null) {
      logger.info(`[IdempotencyService] Cache hit for ${idempotencyKey}`);
      return {
        result: cached as T,
        cached: true
      };
    }

    // Process operation
    const result = await operation();

    // Store result
    await this.set(key, result, ttlSeconds);

    return {
      result,
      cached: false
    };
  }

  private async get(key: string): Promise<any | null> {
    if (this.initialized && this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data);
        }
      } catch (error: any) {
        logger.error("[IdempotencyService] Redis get failed:", error.message);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.result;
    }

    return null;
  }

  private async set(key: string, result: any, ttlSeconds: number): Promise<void> {
    if (this.initialized && this.redis) {
      try {
        await this.redis.setEx(key, ttlSeconds, JSON.stringify(result));
        return;
      } catch (error: any) {
        logger.error("[IdempotencyService] Redis set failed:", error.message);
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(key, {
      result,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (now >= value.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
}

export const idempotencyService = new IdempotencyService();
