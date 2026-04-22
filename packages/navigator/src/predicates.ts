/**
 * Predicate Registry
 *
 * Manages named predicates for conditional node execution.
 * Predicates are referenced by string key so the graph remains JSON-serializable.
 */

import type { BaseSnapshot, PredicateFn } from "./types.js";

export class PredicateRegistry<TSnapshot extends BaseSnapshot = BaseSnapshot> {
  private predicates = new Map<string, PredicateFn<TSnapshot>>();

  /**
   * Register a named predicate function
   */
  register(name: string, fn: PredicateFn<TSnapshot>): void {
    this.predicates.set(name, fn);
  }

  /**
   * Evaluate a predicate by name against a snapshot
   */
  eval(name: string, snap: TSnapshot): boolean {
    const fn = this.predicates.get(name);
    if (!fn) return false;
    return fn(snap);
  }

  /**
   * Check if a predicate exists
   */
  has(name: string): boolean {
    return this.predicates.has(name);
  }

  /**
   * List all registered predicate names
   */
  list(): string[] {
    return Array.from(this.predicates.keys());
  }

  /**
   * Bulk register predicates from an object
   */
  registerAll(predicates: Record<string, PredicateFn<TSnapshot>>): void {
    for (const [name, fn] of Object.entries(predicates)) {
      this.register(name, fn);
    }
  }

  /**
   * Create a composite predicate that requires all predicates to be true
   */
  and(...names: string[]): string {
    const key = `and(${names.join(',')})`;
    this.register(key, (snap) =>
      names.every(n => this.eval(n, snap))
    );
    return key;
  }

  /**
   * Create a composite predicate that requires at least one predicate to be true
   */
  or(...names: string[]): string {
    const key = `or(${names.join(',')})`;
    this.register(key, (snap) =>
      names.some(n => this.eval(n, snap))
    );
    return key;
  }

  /**
   * Create a negated predicate
   */
  not(name: string): string {
    const key = `not(${name})`;
    this.register(key, (snap) => !this.eval(name, snap));
    return key;
  }
}
