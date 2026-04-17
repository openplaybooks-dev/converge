/**
 * Harness Cache
 *
 * Caches synthesized harness code for reuse across similar tasks.
 */

import type { SynthesizedHarness } from './types.ts';

/* ------------------------------------------------------------------ */
/*  Harness Cache                                                     */
/* ------------------------------------------------------------------ */

export class HarnessCache {
  private cache: Map<string, SynthesizedHarness> = new Map();

  /**
   * Get cached harness by key
   */
  get(key: string): SynthesizedHarness | undefined {
    return this.cache.get(key);
  }

  /**
   * Store harness in cache
   */
  set(key: string, harness: SynthesizedHarness): void {
    this.cache.set(key, harness);
    console.log(`[HarnessCache] Cached harness: ${key}`);
  }

  /**
   * Check if harness is cached
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Generate cache key from task context
   */
  generateKey(taskContext: {
    id?: string;
    title?: string;
    description?: string;
    type?: string;
  }): string {
    // Simple hash-like key generation
    const parts = [
      taskContext.type || '',
      taskContext.title || '',
      taskContext.description || '',
    ];

    return parts.join('::').toLowerCase().replace(/[^a-z0-9:]/g, '-');
  }
}

/**
 * Create a new harness cache
 */
export function createHarnessCache(): HarnessCache {
  return new HarnessCache();
}
