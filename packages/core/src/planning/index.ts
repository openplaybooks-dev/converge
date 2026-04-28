/**
 * Planning Module
 *
 * Autonomous planning engine where the filesystem structure IS the plan.
 * Task files in .converge/tasks/ are discovered, executed, and modified dynamically.
 */

export * from "./types.ts";
export * from "./task-scanner.ts";
export * from "./task-file-generator.ts";
export * from "./replan-engine.ts";

// Convenience exports
export { createTaskFileScanner, TaskFileScanner } from "./task-scanner.ts";

export {
  createTaskFileGenerator,
  TaskFileGenerator,
} from "./task-file-generator.ts";

export { createReplanEngine, ReplanEngine } from "./replan-engine.ts";

// Progressive decomposition planner. Two-phase per-layer plan
// (analyze → PLAN.md, implement → child TASK.md / wbs.js) with
// TS-driven recursion. Drives `converge plan <path>`.
// See docs/design/progressive-decomposition.md.
export {
  runPlanLayer,
  type PlanLayerOpts,
} from "./progressive-decomposition.ts";
