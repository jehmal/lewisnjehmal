import { BaseReference, ClauseReference, FigureReference, TableReference } from '@/types/references';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class ReferenceCache {
  private static instance: ReferenceCache;
  private cache: Map<string, CacheEntry<any>>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): ReferenceCache {
    if (!ReferenceCache.instance) {
      ReferenceCache.instance = new ReferenceCache();
    }
    return ReferenceCache.instance;
  }

  /**
   * Gets a reference from the cache
   */
  public get<T extends BaseReference>(ref: BaseReference): T | null {
    const key = this.getCacheKey(ref);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if cache entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Sets a reference in the cache
   */
  public set<T extends BaseReference>(ref: BaseReference, data: T): void {
    const key = this.getCacheKey(ref);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clears the cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Removes expired entries from the cache
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Gets the cache key for a reference
   */
  private getCacheKey(ref: BaseReference): string {
    return `${ref.standard.id}-${ref.standard.version}-${ref.type}-${ref.referenceNumber}`;
  }

  /**
   * Gets the size of the cache
   */
  public getSize(): number {
    return this.cache.size;
  }
} 