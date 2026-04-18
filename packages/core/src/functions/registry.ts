/**
 * Function Registry
 *
 * Central registry for all check, eval, plan, and task functions.
 * Plugins register functions here during initialization.
 */

import type {
  CheckFnMeta,
  EvalFnMeta,
  PlanFnMeta,
  TaskFnMeta,
  FunctionRegistry,
  FunctionRegistration,
} from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Global Function Registry                                          */
/* ------------------------------------------------------------------ */

class FunctionRegistryImpl implements FunctionRegistration {
  private registry: FunctionRegistry = {
    checks: new Map(),
    evals: new Map(),
    plans: new Map(),
    tasks: new Map(),
  };

  /* ──────────────────────────────────────────────────────────── */
  /*  Registration                                                 */
  /* ──────────────────────────────────────────────────────────── */

  registerCheck(meta: CheckFnMeta): void {
    if (this.registry.checks.has(meta.name)) {
      throw new Error(`Check "${meta.name}" is already registered`);
    }
    this.registry.checks.set(meta.name, meta);
  }

  registerEval(meta: EvalFnMeta): void {
    if (this.registry.evals.has(meta.name)) {
      throw new Error(`Eval "${meta.name}" is already registered`);
    }
    this.registry.evals.set(meta.name, meta);
  }

  registerPlan(meta: PlanFnMeta): void {
    if (this.registry.plans.has(meta.name)) {
      throw new Error(`Plan "${meta.name}" is already registered`);
    }
    this.registry.plans.set(meta.name, meta);
  }

  registerTask(meta: TaskFnMeta): void {
    if (this.registry.tasks.has(meta.type)) {
      throw new Error(`Task type "${meta.type}" is already registered`);
    }
    this.registry.tasks.set(meta.type, meta);
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Retrieval                                                    */
  /* ──────────────────────────────────────────────────────────── */

  getCheck(name: string): CheckFnMeta | undefined {
    return this.registry.checks.get(name);
  }

  getEval(name: string): EvalFnMeta | undefined {
    return this.registry.evals.get(name);
  }

  getPlan(name: string): PlanFnMeta | undefined {
    return this.registry.plans.get(name);
  }

  getTask(type: string): TaskFnMeta | undefined {
    return this.registry.tasks.get(type);
  }

  /* ──────────────────────────────────────────────────────────── */
  /*  Queries                                                      */
  /* ──────────────────────────────────────────────────────────── */

  list(): {
    checks: string[];
    evals: string[];
    plans: string[];
    tasks: string[];
  } {
    return {
      checks: Array.from(this.registry.checks.keys()),
      evals: Array.from(this.registry.evals.keys()),
      plans: Array.from(this.registry.plans.keys()),
      tasks: Array.from(this.registry.tasks.keys()),
    };
  }

  /**
   * Get all checks by category
   */
  getChecksByCategory(category: CheckFnMeta["category"]): CheckFnMeta[] {
    return Array.from(this.registry.checks.values()).filter(
      (check) => check.category === category,
    );
  }

  /**
   * Get all plans that handle a specific gap type
   */
  getPlansByGapType(gapType: string): PlanFnMeta[] {
    return Array.from(this.registry.plans.values())
      .filter((plan) => plan.gapTypes?.includes(gapType))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Higher priority first
  }

  /**
   * Get all tasks that can run in parallel
   */
  getParallelTasks(): TaskFnMeta[] {
    return Array.from(this.registry.tasks.values()).filter(
      (task) => task.parallel,
    );
  }

  /**
   * Clear all registered functions (for testing)
   */
  clear(): void {
    this.registry.checks.clear();
    this.registry.evals.clear();
    this.registry.plans.clear();
    this.registry.tasks.clear();
  }

  /**
   * Get the internal registry (read-only access)
   */
  getRegistry(): Readonly<FunctionRegistry> {
    return this.registry;
  }
}

/* ------------------------------------------------------------------ */
/*  Global Instance                                                   */
/* ------------------------------------------------------------------ */

/**
 * Global function registry instance
 */
export const globalRegistry = new FunctionRegistryImpl();

/**
 * Create a new isolated registry (for testing or multi-tenant scenarios)
 */
export function createRegistry(): FunctionRegistration {
  return new FunctionRegistryImpl();
}

/* ------------------------------------------------------------------ */
/*  Convenience Functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Register a check function globally
 */
export function registerCheck(meta: CheckFnMeta): void {
  globalRegistry.registerCheck(meta);
}

/**
 * Register an eval function globally
 */
export function registerEval(meta: EvalFnMeta): void {
  globalRegistry.registerEval(meta);
}

/**
 * Register a plan function globally
 */
export function registerPlan(meta: PlanFnMeta): void {
  globalRegistry.registerPlan(meta);
}

/**
 * Register a task function globally
 */
export function registerTask(meta: TaskFnMeta): void {
  globalRegistry.registerTask(meta);
}

/**
 * Get a check function by name
 */
export function getCheck(name: string): CheckFnMeta | undefined {
  return globalRegistry.getCheck(name);
}

/**
 * Get an eval function by name
 */
export function getEval(name: string): EvalFnMeta | undefined {
  return globalRegistry.getEval(name);
}

/**
 * Get a plan function by name
 */
export function getPlan(name: string): PlanFnMeta | undefined {
  return globalRegistry.getPlan(name);
}

/**
 * Get a task function by type
 */
export function getTask(type: string): TaskFnMeta | undefined {
  return globalRegistry.getTask(type);
}

/**
 * List all registered functions
 */
export function listFunctions(): {
  checks: string[];
  evals: string[];
  plans: string[];
  tasks: string[];
} {
  return globalRegistry.list();
}
