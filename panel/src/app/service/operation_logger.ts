import { JsonlStorageSubsystem } from "./../common/storage/jsonl_storage";
import { v4 } from "uuid";
import type { OperationLoggerItem, OperationLoggerItemPayload } from "../../types/operation_logger";
import RemoteRequest from "./remote_command";
import RemoteServiceSubsystem from "./remote_service";

type CleanPayload<T extends keyof OperationLoggerItemPayload> = Omit<
  OperationLoggerItemPayload[T],
  "operation_id" | "operation_time" | "operation_level"
>;

class OperationLogger {
  #storage: JsonlStorageSubsystem;
  #instanceStorage: JsonlStorageSubsystem;
  #buffer: Map<string, OperationLoggerItem>;
  #instanceBuffers: Map<string, Map<string, OperationLoggerItem>>;
  #bufferSize: number;
  #flushTimer: NodeJS.Timeout | null = null;

  constructor(bufferSize = 20) {
    this.#storage = new JsonlStorageSubsystem("/operation_logs", 200);
    this.#instanceStorage = new JsonlStorageSubsystem("/operation_logs/instances", 1000);
    this.#buffer = new Map();
    this.#instanceBuffers = new Map();
    this.#bufferSize = bufferSize;
    this.startFlushTimer();
  }

  async flushAsync(buffer: Map<string, OperationLoggerItem> = this.#buffer) {
    if (buffer.size === 0) return true;
    const entries = Array.from(buffer.values());
    await this.#storage.append("global", entries);
    return true;
  }

  async flushInstanceAsync(instanceId: string, buffer: Map<string, OperationLoggerItem>) {
    if (buffer.size === 0) return true;
    const entries = Array.from(buffer.values());
    await this.#instanceStorage.append(instanceId, entries);
    return true;
  }

  flushSync(buffer: Map<string, OperationLoggerItem> = this.#buffer) {
    if (buffer.size === 0) return true;
    const entries = Array.from(buffer.values());
    this.#storage.append("global", entries, true);
    return true;
  }

  flushInstanceSync(instanceId: string, buffer: Map<string, OperationLoggerItem>) {
    if (buffer.size === 0) return true;
    const entries = Array.from(buffer.values());
    this.#instanceStorage.append(instanceId, entries, true);
    return true;
  }

  flushAllInstancesSync() {
    for (const [instanceId, buffer] of this.#instanceBuffers) {
      this.flushInstanceSync(instanceId, buffer);
    }
    this.#instanceBuffers.clear();
  }

  checkBufferQueue() {
    if (this.#buffer.size < this.#bufferSize) return;
    const currentBuffer = this.#buffer;
    this.#buffer = new Map();
    this.flushAsync(currentBuffer);
  }

  checkInstanceBufferQueue(instanceId: string) {
    const buffer = this.#instanceBuffers.get(instanceId);
    if (!buffer || buffer.size < this.#bufferSize) return;
    const currentBuffer = buffer;
    this.#instanceBuffers.set(instanceId, new Map());
    this.flushInstanceAsync(instanceId, currentBuffer);
  }

  log<T extends keyof OperationLoggerItemPayload>(
    type: T,
    payload: CleanPayload<T>,
    level: "info" | "warning" | "error" = "info",
    skipInstanceLog = false
  ) {
    const operation_id = v4();
    const operation_time = Date.now().toString();

    const item: OperationLoggerItem = {
      type,
      operation_id,
      operation_time,
      operation_level: level,
      ...payload
    } as unknown as OperationLoggerItem;

    // Write to global buffer
    this.#buffer.set(operation_id, item);
    this.checkBufferQueue();

    // Write to instance-specific buffer if instance_id exists (skip for admins)
    if (!skipInstanceLog) {
      const instanceId = (payload as any).instance_id;
      if (instanceId) {
        if (!this.#instanceBuffers.has(instanceId)) {
          this.#instanceBuffers.set(instanceId, new Map());
        }
        this.#instanceBuffers.get(instanceId)!.set(operation_id, item);
        this.checkInstanceBufferQueue(instanceId);
      }
    }

    return operation_id;
  }

  async get(limit = 20) {
    if (limit <= this.#buffer.size) return Array.from(this.#buffer.values()).slice(-limit);
    const currentBuffer = this.#buffer;
    this.#buffer = new Map();
    await this.flushAsync(currentBuffer);
    return this.#storage.tail<OperationLoggerItem>("global", limit);
  }

  async getByInstance(instanceId: string, limit = 50) {
    const buffer = this.#instanceBuffers.get(instanceId);
    if (buffer && limit <= buffer.size) {
      return Array.from(buffer.values()).slice(-limit);
    }
    // Flush instance buffer first
    if (buffer && buffer.size > 0) {
      const currentBuffer = buffer;
      this.#instanceBuffers.set(instanceId, new Map());
      await this.flushInstanceAsync(instanceId, currentBuffer);
    }
    return this.#instanceStorage.tail<OperationLoggerItem>(instanceId, limit);
  }

  async deleteInstanceLogs(instanceId: string) {
    // Clear buffer for this instance
    this.#instanceBuffers.delete(instanceId);
    // Clear storage file
    await this.#instanceStorage.clear(instanceId);
  }

  info<T extends keyof OperationLoggerItemPayload>(type: T, payload: CleanPayload<T>) {
    return this.log(type, payload, "info");
  }

  warning<T extends keyof OperationLoggerItemPayload>(type: T, payload: CleanPayload<T>) {
    return this.log(type, payload, "warning");
  }

  error<T extends keyof OperationLoggerItemPayload>(type: T, payload: CleanPayload<T>) {
    return this.log(type, payload, "error");
  }

  private startFlushTimer() {
    this.#flushTimer = setInterval(() => {
      // Flush global buffer
      if (this.#buffer.size > 0) {
        const currentBuffer = this.#buffer;
        this.#buffer = new Map();
        this.flushAsync(currentBuffer);
      }
      // Flush all instance buffers and clean up empty ones
      const emptyInstances: string[] = [];
      for (const [instanceId, buffer] of this.#instanceBuffers) {
        if (buffer.size > 0) {
          const currentBuffer = buffer;
          this.#instanceBuffers.set(instanceId, new Map());
          this.flushInstanceAsync(instanceId, currentBuffer);
        } else {
          // Mark empty buffers for cleanup
          emptyInstances.push(instanceId);
        }
      }
      // Clean up empty buffers to prevent memory leaks
      for (const instanceId of emptyInstances) {
        this.#instanceBuffers.delete(instanceId);
      }
    }, 5000);
  }

  public stopFlushTimer() {
    if (this.#flushTimer) {
      clearInterval(this.#flushTimer);
      this.#flushTimer = null;
    }
  }
}

export const operationLogger = new OperationLogger();

process.on("SIGINT", () => {
  operationLogger.stopFlushTimer();
  operationLogger.flushSync();
  operationLogger.flushAllInstancesSync();
});

process.on("exit", () => {
  operationLogger.stopFlushTimer();
  operationLogger.flushSync();
  operationLogger.flushAllInstancesSync();
});
