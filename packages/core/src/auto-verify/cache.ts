/**
 * Converge Cache
 *
 * Caches synthesized verification code for reuse across similar tasks.
 */

import type { SynthesizedVerification } from './types.ts';

/* ------------------------------------------------------------------ */
/*  Converge Cache                                                     */
/* ------------------------------------------------------------------ */

export class ConvergeCache {
  private cache: Map<string, SynthesizedVerification> = new Map();

  /**
   * Get cached verification by key
   */
  get(key: string): SynthesizedVerification | undefined {
    return this.cache.get(key);
  }

  /**
   * Store verification in cache
   */
  set(key: string, verification: SynthesizedVerification): void {
    this.cache.set(key, verification);
    console.log(`[ConvergeCache] Cached verification: ${key}`);
  }

  /**
   * Check if verification is cached
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
 * Create a new converge cache
 */
export function createConvergeCache(): ConvergeCache {
  return new ConvergeCache();
}
