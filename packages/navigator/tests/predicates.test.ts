/**
 * Tests for PredicateRegistry
 */

import { describe, it, expect } from "vitest";
import { PredicateRegistry } from "../src/predicates.ts";
import type { BaseSnapshot } from "../src/types.ts";

interface TestSnapshot extends BaseSnapshot {
  value: number;
  flag: boolean;
}

describe("PredicateRegistry", () => {
  it("register adds a predicate", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    
    registry.register("test", (snap) => snap.value > 10);
    
    expect(registry.has("test")).toBe(true);
  });

  it("eval evaluates registered predicate", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("isPositive", (snap) => snap.value > 0);
    
    const result1 = registry.eval("isPositive", { iteration: 1, value: 5, flag: true });
    const result2 = registry.eval("isPositive", { iteration: 1, value: -5, flag: true });
    
    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it("eval returns false for unknown predicate", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    
    const result = registry.eval("unknown", { iteration: 1, value: 5, flag: true });
    
    expect(result).toBe(false);
  });

  it("has returns false for unregistered predicate", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    
    expect(registry.has("unknown")).toBe(false);
  });

  it("list returns all predicate names", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("pred1", () => true);
    registry.register("pred2", () => false);
    
    const names = registry.list();
    
    expect(names).toHaveLength(2);
    expect(names).toContain("pred1");
    expect(names).toContain("pred2");
  });

  it("registerAll bulk registers predicates", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    
    registry.registerAll({
      isPositive: (snap) => snap.value > 0,
      isEven: (snap) => snap.value % 2 === 0,
      isFlagged: (snap) => snap.flag,
    });
    
    expect(registry.list()).toHaveLength(3);
    expect(registry.eval("isPositive", { iteration: 1, value: 5, flag: true })).toBe(true);
    expect(registry.eval("isEven", { iteration: 1, value: 4, flag: true })).toBe(true);
    expect(registry.eval("isFlagged", { iteration: 1, value: 0, flag: true })).toBe(true);
  });

  it("predicates can access all snapshot fields", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("complex", (snap) => snap.value > 10 && snap.flag && snap.iteration > 1);
    
    const result1 = registry.eval("complex", { iteration: 2, value: 15, flag: true });
    const result2 = registry.eval("complex", { iteration: 1, value: 15, flag: true });
    
    expect(result1).toBe(true);
    expect(result2).toBe(false);
  });

  it("and() creates composite predicate requiring all to be true", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("isPositive", (snap) => snap.value > 0);
    registry.register("isEven", (snap) => snap.value % 2 === 0);
    
    const andKey = registry.and("isPositive", "isEven");
    
    expect(registry.eval(andKey, { iteration: 1, value: 4, flag: true })).toBe(true);
    expect(registry.eval(andKey, { iteration: 1, value: 3, flag: true })).toBe(false);
    expect(registry.eval(andKey, { iteration: 1, value: -2, flag: true })).toBe(false);
  });

  it("or() creates composite predicate requiring at least one to be true", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("isPositive", (snap) => snap.value > 0);
    registry.register("isFlagged", (snap) => snap.flag);
    
    const orKey = registry.or("isPositive", "isFlagged");
    
    expect(registry.eval(orKey, { iteration: 1, value: 5, flag: false })).toBe(true);
    expect(registry.eval(orKey, { iteration: 1, value: -5, flag: true })).toBe(true);
    expect(registry.eval(orKey, { iteration: 1, value: -5, flag: false })).toBe(false);
  });

  it("not() creates negated predicate", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("isPositive", (snap) => snap.value > 0);
    
    const notKey = registry.not("isPositive");
    
    expect(registry.eval(notKey, { iteration: 1, value: 5, flag: true })).toBe(false);
    expect(registry.eval(notKey, { iteration: 1, value: -5, flag: true })).toBe(true);
  });

  it("composite predicates can be nested", () => {
    const registry = new PredicateRegistry<TestSnapshot>();
    registry.register("isPositive", (snap) => snap.value > 0);
    registry.register("isEven", (snap) => snap.value % 2 === 0);
    registry.register("isFlagged", (snap) => snap.flag);
    
    const andKey = registry.and("isPositive", "isEven");
    const orKey = registry.or(andKey, "isFlagged");
    
    // (positive AND even) OR flagged
    expect(registry.eval(orKey, { iteration: 1, value: 4, flag: false })).toBe(true);
    expect(registry.eval(orKey, { iteration: 1, value: 3, flag: false })).toBe(false);
    expect(registry.eval(orKey, { iteration: 1, value: 3, flag: true })).toBe(true);
  });
});
