import NodeCache from "node-cache";
import { logger } from "./log";
import type { UserPermissions } from "../entity/entity_interface";

class PermissionCacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every 60s
      useClones: false, // Return references (faster)
      maxKeys: 10000 // Prevent memory bloat
    });

    // Log cache stats every 5 minutes
    setInterval(() => {
      const stats = this.cache.getStats();
      if (stats.hits > 0 || stats.misses > 0) {
        logger.debug(
          `[PermissionCache] Stats: ${stats.hits} hits, ${stats.misses} misses, ${stats.keys} keys`
        );
      }
    }, 300000);

    logger.info("[PermissionCacheService] Initialized");
  }

  private getCacheKey(userId: string, instanceUuid: string): string {
    return `perms:${userId}:${instanceUuid}`;
  }

  /**
   * Get cached permissions for a user+instance
   */
  get(userId: string, instanceUuid: string): UserPermissions | undefined {
    const key = this.getCacheKey(userId, instanceUuid);
    const cached = this.cache.get<UserPermissions>(key);

    if (cached) {
      logger.debug(`[PermissionCache] Hit for ${userId}:${instanceUuid}`);
    }

    return cached;
  }

  /**
   * Cache permissions for a user+instance
   */
  set(userId: string, instanceUuid: string, permissions: UserPermissions): void {
    const key = this.getCacheKey(userId, instanceUuid);
    this.cache.set(key, permissions);
    logger.debug(`[PermissionCache] Set for ${userId}:${instanceUuid}`);
  }

  /**
   * Invalidate cached permissions for a user
   * Call this when permissions are updated
   */
  invalidate(userId: string, instanceUuid?: string): void {
    if (instanceUuid) {
      // Invalidate specific instance
      const key = this.getCacheKey(userId, instanceUuid);
      this.cache.del(key);
      logger.debug(`[PermissionCache] Invalidated ${key}`);
    } else {
      // Invalidate all permissions for this user
      const keys = this.cache.keys().filter((k) => k.startsWith(`perms:${userId}:`));
      if (keys.length > 0) {
        this.cache.del(keys);
        logger.debug(`[PermissionCache] Invalidated ${keys.length} keys for ${userId}`);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.flushAll();
    logger.info("[PermissionCache] Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getStats(): { hits: number; misses: number; keys: number } {
    const stats = this.cache.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      keys: stats.keys
    };
  }
}

export const permissionCache = new PermissionCacheService();
