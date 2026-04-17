/**
 * Function-Driven Execution Module
 *
 * Exports all function types, builders, and registry.
 */

// Types
export type {
  CheckFn,
  CheckFnMeta,
  EvalFn,
  EvalFnMeta,
  PlanFn,
  PlanFnMeta,
  TaskFn,
  TaskFnMeta,
  TaskResult,
  FunctionRegistry,
  FunctionRegistration,
  CheckBuilder,
  EvalBuilder,
  PlanBuilder,
  TaskBuilder,
} from './types.ts';

// Builders
export { check, eval, plan, task } from './builders.ts';

// Registry
export {
  globalRegistry,
  createRegistry,
  registerCheck,
  registerEval,
  registerPlan,
  registerTask,
  getCheck,
  getEval,
  getPlan,
  getTask,
  listFunctions,
} from './registry.ts';
