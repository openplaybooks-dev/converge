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

// Runtime ledger helpers for convention-driven goal/task tracking.
export {
  runtimeLedgerDir,
  runtimeGoalsPath,
  runtimeTasksPath,
  ensureRuntimeLedger,
  appendGoalUpsert,
  appendGoalStatus,
  appendTaskUpsert,
  appendTaskStatus,
  readRuntimeLedgerState,
  readTaskInventoryState,
  selectNextBuildableGoal,
} from "./runtime-ledger.ts";
export type {
  GoalRuntimeStatus,
  TaskRuntimeStatus,
  RuntimeGoal,
  RuntimeTask,
  RuntimeLedgerState,
} from "./runtime-ledger.ts";

// Playbook-goal helpers (parsing + goal-check execution against checks/ scripts)
export {
  parsePlaybookGoals,
  goalsSentinelDir,
  readDoneGoalIds,
  writeGoalDoneSentinel,
  removeGoalDoneSentinel,
  runGoalChecks,
  getPendingGoals,
} from "./playbook-goals.ts";
export type {
  PlaybookGoal,
  PlaybookGoalCheck,
  GoalCheckResult,
  RunGoalChecksResult,
} from "./playbook-goals.ts";

// Safe-id helpers
export { assertSafeId, isSafeId, InvalidIdError } from "./safe-id.ts";
