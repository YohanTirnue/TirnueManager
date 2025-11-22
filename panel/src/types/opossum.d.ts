declare module 'opossum' {
  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
    name?: string;
    group?: string;
    rollingPercentilesEnabled?: boolean;
    capacity?: number;
    errorFilter?: (error: Error) => boolean;
    cache?: boolean;
    cacheGetKey?: (...args: any[]) => string;
    cacheTransport?: any;
    abortController?: AbortController;
    enableSnapshots?: boolean;
    rotateBucketController?: any;
    allowWarmUp?: boolean;
    warmUpCallVolume?: number;
  }

  interface CircuitBreakerStats {
    failures: number;
    fallbacks: number;
    successes: number;
    rejects: number;
    fires: number;
    timeouts: number;
    cacheHits: number;
    cacheMisses: number;
    semaphoreRejections: number;
    percentiles: Record<string, number>;
    latencyTimes: number[];
    latencyMean: number;
  }

  class CircuitBreaker<TI extends unknown[] = unknown[], TO = unknown> {
    constructor(action: (...args: TI) => Promise<TO>, options?: CircuitBreakerOptions);

    fire(...args: TI): Promise<TO>;
    fallback(func: (...args: TI) => TO | Promise<TO>): this;

    get name(): string;
    get group(): string;
    get enabled(): boolean;
    get pendingClose(): boolean;
    get closed(): boolean;
    get opened(): boolean;
    get halfOpen(): boolean;
    get warmUp(): boolean;
    get isShutdown(): boolean;
    get volumeThreshold(): number;
    get stats(): CircuitBreakerStats;

    enable(): void;
    disable(): void;
    open(): void;
    close(): void;
    shutdown(): void;
    toJSON(): object;

    clearCache(): void;
    healthCheck(): Promise<void>;

    on(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
  }

  export default CircuitBreaker;
  export { CircuitBreaker, CircuitBreakerOptions, CircuitBreakerStats };
}
