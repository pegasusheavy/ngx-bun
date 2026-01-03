/**
 * Simple LRU (Least Recently Used) cache implementation
 * Optimized for Bun's runtime
 */
export class LRUCache<T> {
  private cache: Map<string, T>;
  readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Get an item from the cache
   * Moves the item to the end (most recently used)
   */
  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /**
   * Set an item in the cache
   * Evicts the least recently used item if cache is full
   */
  set(key: string, value: T): void {
    // If key exists, delete it first (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // If at capacity, delete oldest (first) entry
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete an item from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  /**
   * Get all values in the cache
   */
  values(): IterableIterator<T> {
    return this.cache.values();
  }

  /**
   * Get all entries in the cache
   */
  entries(): IterableIterator<[string, T]> {
    return this.cache.entries();
  }
}
