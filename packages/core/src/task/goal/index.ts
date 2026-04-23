/**
 * Goal Module - Public API
 *
 * Exports goal types, evaluator, and builder.
 */

// Types
export type {
  Goal,
  GoalStatus,
  GoalHierarchy,
  GoalNode,
  GoalEvaluator,
  GoalEvaluationContext,
  GoalBuilder,
  GoalSatisfactionStrategy,
  GoalSatisfactionPlan,
  GoalConvergenceConfig,
  GoalProgressUpdate,
  GoalConvergenceResult,
} from "./types.ts";

// Evaluator
export {
  GoalEvaluatorImpl,
  extractTasksFromUnsatisfiedGoals,
  flattenGoalHierarchy,
  countGoals,
  findGoalById,
} from "./evaluator.ts";

// Builder
export { goal, defineGoal } from "./builder.ts";
