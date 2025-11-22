import { logger } from "./log";
import userSystem from "./user_service";

/**
 * Index service for O(1) sub-user lookups
 * Maintains in-memory indexes that are rebuilt on startup
 */
class SubUserIndexService {
  // Map: subUserUuid → parentUserUuid
  private subUserToParent: Map<string, string> = new Map();

  // Map: parentUuid:instanceUuid → Set<subUserUuid>
  private instanceToSubUsers: Map<string, Set<string>> = new Map();

  private initialized: boolean = false;

  /**
   * Build indexes from current user data
   * Should be called after users are loaded
   */
  buildIndex(): void {
    this.subUserToParent.clear();
    this.instanceToSubUsers.clear();

    let indexedCount = 0;

    for (const [parentUuid, user] of userSystem.objects) {
      if (user.subUsers && user.subUsers.length > 0) {
        for (const subUser of user.subUsers) {
          // Index: subUser → parent
          this.subUserToParent.set(subUser.uuid, parentUuid);

          // Index: instance → subUsers
          const key = `${parentUuid}:${subUser.instanceUuid}`;
          if (!this.instanceToSubUsers.has(key)) {
            this.instanceToSubUsers.set(key, new Set());
          }
          this.instanceToSubUsers.get(key)!.add(subUser.uuid);

          indexedCount++;
        }
      }
    }

    this.initialized = true;
    logger.info(
      `[SubUserIndex] Index built: ${indexedCount} sub-user entries, ` +
      `${this.subUserToParent.size} unique sub-users`
    );
  }

  /**
   * Get parent user UUID for a sub-user (O(1) lookup)
   */
  getParentUserUuid(subUserUuid: string): string | undefined {
    return this.subUserToParent.get(subUserUuid);
  }

  /**
   * Get all sub-user UUIDs for an instance (O(1) lookup)
   */
  getSubUsersForInstance(parentUuid: string, instanceUuid: string): string[] {
    const key = `${parentUuid}:${instanceUuid}`;
    const subUsers = this.instanceToSubUsers.get(key);
    return subUsers ? Array.from(subUsers) : [];
  }

  /**
   * Check if a user is a sub-user (O(1) lookup)
   */
  isSubUser(userUuid: string): boolean {
    return this.subUserToParent.has(userUuid);
  }

  /**
   * Add a sub-user to the index
   * Call this when creating a new sub-user
   */
  addSubUser(parentUuid: string, subUserUuid: string, instanceUuid: string): void {
    // Index: subUser → parent
    this.subUserToParent.set(subUserUuid, parentUuid);

    // Index: instance → subUsers
    const key = `${parentUuid}:${instanceUuid}`;
    if (!this.instanceToSubUsers.has(key)) {
      this.instanceToSubUsers.set(key, new Set());
    }
    this.instanceToSubUsers.get(key)!.add(subUserUuid);

    logger.debug(`[SubUserIndex] Added sub-user ${subUserUuid} for parent ${parentUuid}`);
  }

  /**
   * Remove a sub-user from the index
   * Call this when removing a sub-user
   */
  removeSubUser(parentUuid: string, subUserUuid: string, instanceUuid: string): void {
    // Remove from subUser → parent index
    this.subUserToParent.delete(subUserUuid);

    // Remove from instance → subUsers index
    const key = `${parentUuid}:${instanceUuid}`;
    const subUsers = this.instanceToSubUsers.get(key);
    if (subUsers) {
      subUsers.delete(subUserUuid);
      if (subUsers.size === 0) {
        this.instanceToSubUsers.delete(key);
      }
    }

    logger.debug(`[SubUserIndex] Removed sub-user ${subUserUuid} from parent ${parentUuid}`);
  }

  /**
   * Get index statistics
   */
  getStats(): { subUsers: number; instances: number; initialized: boolean } {
    return {
      subUsers: this.subUserToParent.size,
      instances: this.instanceToSubUsers.size,
      initialized: this.initialized
    };
  }
}

export const subUserIndex = new SubUserIndexService();
