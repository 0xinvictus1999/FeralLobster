/**
 * Axobase v2 - Expression Engine Cache
 * 
 * Intelligent caching system for genome expression calculations.
 * 
 * Cache strategy:
 * - Environment-sensitive hashing (only significant changes invalidate)
 * - LRU eviction for memory management
 * - Prefetching for anticipated calculations
 * - Statistics for performance monitoring
 */

import { createHash } from 'crypto';
import { DynamicGenome, EnvironmentalState, ExpressedGenome } from './types.js';
import { ExpressionCacheEntry, CacheStats } from './advancedTypes.js';

// ============================================================================
// Cache Configuration
// ============================================================================

export interface CacheConfig {
  maxSize: number;                 // 最大条目数
  defaultTTL: number;              // 默认生存时间 (ms)
  cleanupInterval: number;         // 清理间隔 (ms)
  enablePrefetching: boolean;      // 是否启用预取
  environmentSensitivity: number;  // 环境哈希敏感度
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTTL: 60000,               // 1分钟
  cleanupInterval: 300000,         // 5分钟
  enablePrefetching: true,
  environmentSensitivity: 0.1,
};

// ============================================================================
// Expression Cache
// ============================================================================

export class ExpressionCache {
  private cache = new Map<string, ExpressionCacheEntry>();
  private accessOrder: string[] = [];  // LRU追踪
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
    };
    this.startCleanupTimer();
  }

  /**
   * Get cached expression result
   */
  get(genome: DynamicGenome, environment: EnvironmentalState): ExpressedGenome | null {
    const key = this.generateCacheKey(genome, environment);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // 更新访问记录
    this.updateAccessOrder(key);
    entry.hitCount++;
    this.stats.hits++;
    this.updateHitRate();

    return entry.result as ExpressedGenome;
  }

  /**
   * Store expression result in cache
   */
  set(
    genome: DynamicGenome,
    environment: EnvironmentalState,
    result: ExpressedGenome,
    ttl?: number
  ): void {
    const key = this.generateCacheKey(genome, environment);
    const environmentHash = this.hashEnvironment(environment);

    // 检查是否需要淘汰
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: ExpressionCacheEntry = {
      result,
      timestamp: Date.now(),
      environmentHash,
      ttl: ttl || this.config.defaultTTL,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    this.addToAccessOrder(key);
    this.updateStats();
  }

  /**
   * Invalidate entries matching criteria
   */
  invalidate(criteria: {
    genomeHash?: string;
    olderThan?: number;
    lowHitCount?: number;
  }): number {
    let invalidated = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      let shouldInvalidate = false;

      if (criteria.genomeHash && key.startsWith(criteria.genomeHash)) {
        shouldInvalidate = true;
      }

      if (criteria.olderThan && now - entry.timestamp > criteria.olderThan) {
        shouldInvalidate = true;
      }

      if (criteria.lowHitCount && entry.hitCount < criteria.lowHitCount) {
        shouldInvalidate = true;
      }

      if (shouldInvalidate) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        invalidated++;
      }
    }

    this.updateStats();
    return invalidated;
  }

  /**
   * Prefetch expression for anticipated environment
   */
  async prefetch(
    genome: DynamicGenome,
    environment: EnvironmentalState,
    computeFn: () => Promise<ExpressedGenome>
  ): Promise<void> {
    if (!this.config.enablePrefetching) return;

    const key = this.generateCacheKey(genome, environment);
    
    // 如果已存在，不重复预取
    if (this.cache.has(key)) return;

    // 异步计算并缓存
    try {
      const result = await computeFn();
      this.set(genome, environment, result);
    } catch (error) {
      // 预取失败不应影响主流程
      console.warn('[ExpressionCache] Prefetch failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.updateStats();
  }

  /**
   * Dispose cache (cleanup timers)
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate cache key from genome and environment
   * 
   * Key design: 只对环境的关键变化敏感
   */
  private generateCacheKey(genome: DynamicGenome, env: EnvironmentalState): string {
    const genomePart = genome.meta.genomeHash.slice(0, 16);
    const envPart = this.hashEnvironment(env);
    return `${genomePart}:${envPart}`;
  }

  /**
   * Hash environment to detect significant changes
   * 
   * 策略: 量化环境状态，只关注显著变化
   */
  private hashEnvironment(env: EnvironmentalState): string {
    // 量化连续值
    const balanceTier = Math.floor(env.balanceUSDC / 10); // 每10 USDC一档
    const starvingTier = Math.floor(env.daysStarving / 2); // 每2天一档
    const thrivingTier = Math.floor(env.daysThriving / 7); // 每周一档
    
    // 组合关键环境因子
    const envString = [
      env.currentMode,
      balanceTier.toString(),
      starvingTier.toString(),
      thrivingTier.toString(),
      env.stressLevel > 0.7 ? 'high_stress' : env.stressLevel > 0.3 ? 'med_stress' : 'low_stress',
      env.recentDeceptions > 0 ? 'deceived' : 'trusted',
    ].join('|');

    return createHash('md5').update(envString).digest('hex').slice(0, 8);
  }

  /**
   * LRU: 更新访问顺序
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * LRU: 添加新条目
   */
  private addToAccessOrder(key: string): void {
    if (!this.accessOrder.includes(key)) {
      this.accessOrder.push(key);
    }
  }

  /**
   * LRU: 移除条目
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * LRU: 淘汰最久未使用
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    const lruKey = this.accessOrder[0];
    this.cache.delete(lruKey);
    this.accessOrder.shift();
  }

  /**
   * 更新命中率统计
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    
    // 估算内存使用 (rough estimate)
    let memoryBytes = 0;
    for (const entry of this.cache.values()) {
      memoryBytes += JSON.stringify(entry).length * 2; // UTF-16
    }
    this.stats.memoryUsage = memoryBytes;
  }

  /**
   * 启动定时清理
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期条目
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        expired++;
      }
    }

    if (expired > 0) {
      this.updateStats();
    }
  }
}

// ============================================================================
// Global Cache Instance
// ============================================================================

let globalCache: ExpressionCache | null = null;

export function getGlobalCache(config?: Partial<CacheConfig>): ExpressionCache {
  if (!globalCache) {
    globalCache = new ExpressionCache(config);
  }
  return globalCache;
}

export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.dispose();
    globalCache = null;
  }
}

// ============================================================================
// Cached Expression Function
// ============================================================================

export async function cachedExpressGenome(
  genome: DynamicGenome,
  environment: EnvironmentalState,
  computeFn: () => Promise<ExpressedGenome>,
  cache?: ExpressionCache
): Promise<ExpressedGenome> {
  const useCache = cache || getGlobalCache();
  
  // 尝试从缓存获取
  const cached = useCache.get(genome, environment);
  if (cached) {
    return cached;
  }
  
  // 计算新结果
  const result = await computeFn();
  
  // 存入缓存
  useCache.set(genome, environment, result);
  
  return result;
}

// ============================================================================
// Multi-Genome Batch Cache
// ============================================================================

export class BatchExpressionCache {
  private cache: ExpressionCache;
  private pendingComputations = new Map<string, Promise<ExpressedGenome>>();

  constructor(cache?: ExpressionCache) {
    this.cache = cache || getGlobalCache();
  }

  /**
   * 批量获取表达结果，自动去重相同计算
   */
  async getBatch(
    requests: Array<{ genome: DynamicGenome; environment: EnvironmentalState }>,
    computeFn: (g: DynamicGenome, e: EnvironmentalState) => Promise<ExpressedGenome>
  ): Promise<ExpressedGenome[]> {
    const results: ExpressedGenome[] = [];
    const keys: string[] = [];

    // 生成所有key
    for (const req of requests) {
      const key = this.generateKey(req.genome, req.environment);
      keys.push(key);
    }

    // 查找缓存和挂起计算
    const computations: Promise<void>[] = [];
    
    for (let i = 0; i < requests.length; i++) {
      const key = keys[i];
      const { genome, environment } = requests[i];

      const cached = this.cache.get(genome, environment);
      if (cached) {
        results[i] = cached;
        continue;
      }

      // 检查是否有挂起的相同计算
      const pending = this.pendingComputations.get(key);
      if (pending) {
        computations.push(
          pending.then(result => { results[i] = result; })
        );
        continue;
      }

      // 启动新计算
      const computation = computeFn(genome, environment).then(result => {
        this.cache.set(genome, environment, result);
        this.pendingComputations.delete(key);
        results[i] = result;
        return result;
      });

      this.pendingComputations.set(key, computation);
      computations.push(computation.then(() => {}));
    }

    await Promise.all(computations);
    return results;
  }

  private generateKey(genome: DynamicGenome, env: EnvironmentalState): string {
    return `${genome.meta.genomeHash}:${JSON.stringify({
      mode: env.currentMode,
      balance: Math.floor(env.balanceUSDC / 10),
      starving: Math.floor(env.daysStarving),
    })}`;
  }
}
