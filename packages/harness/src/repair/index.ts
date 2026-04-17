/**
 * Repair System — Public API
 *
 * Gap resolution is driven by the Navigator Graph walker.
 * The walker uses a unified predicate registry for condition nodes
 * and action handlers for execution, including the repair-loop handler
 * that encapsulates AI-driven strategy selection and plan generation.
 *
 * TS strategies (registered as FixStrategy classes):
 *   UserQuestionResumeStrategy (10)           — Handle user input
 *   WBSGeneratorRepairStrategy (10)           — Fix systemic WBS generator bugs
 *   DependencyBackoffStrategy (9)             — Defer to run upstream first
 *   MissingInputPatternRepairStrategy (8.5)   — Detect glob pattern mismatches
 *   ToolEnvironmentRepairStrategy (8)         — Handle tool/env issues
 *   TaskRunStrategy (5)                       — Full re-execution (last resort)
 *
 * Skill strategies (loaded from .harness/skills/repair/ + builtin templates):
 *   repair-taskmd             — TASK.md structural fixes
 *   repair-check-failed       — check failure repair
 *   repair-missing-output     — produce missing files
 *   repair-dependency         — resolve upstream deps
 *   repair-spawn-intermediate — create new tasks
 *   repair-router             — fallback triage
 *   + any custom skills created by MetaOptimizationSidecar
 */

export type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
  RetryMode,
  AttemptRecord,
  Resolution,
  JournalContext,
} from './types.ts';

export { GapRepairPredicate } from './predicate.ts';
export type { RepairState } from './predicate.ts';
export { ExecutionTimeline } from './timeline.ts';
export type { TimelineEntry } from './timeline.ts';
export { AttemptTracker } from './attempt-tracker.ts';
export { HistoryIndexBuilder } from './history-index.ts';
export type { HistoryIndex, AttemptSummary } from './history-index.ts';
export { writeRepairContext, buildFilesystemRepairPrompt } from './context-writer.ts';
export type { ContextWriterParams, ContextWriterResult } from './context-writer.ts';
export { PromptBuilder } from './system-prompts.ts';
export { runAgent, getAgentLogDir, resolveAIConfig, listAIProviders } from './agent-runner.ts';
export type { ResolvedAIConfig } from './agent-runner.ts';
export { prepareFeedback } from './feedback-writer.ts';

// Active strategies (7)
export { TaskRunStrategy } from './strategies/task-run.ts';
export { WBSGeneratorRepairStrategy } from './strategies/wbs-generator-repair.ts';
export { ToolEnvironmentRepairStrategy } from './strategies/tool-environment-repair.ts';
export { DependencyBackoffStrategy } from './strategies/dependency-backoff.ts';
export { MissingInputPatternRepairStrategy } from './strategies/missing-input-pattern.ts';
export { UserQuestionResumeStrategy } from './strategies/user-question-resume.ts';
export { SkillBasedRepairStrategy } from './strategies/skill-based-repair.ts';
export { WbsScriptRepairStrategy } from './strategies/wbs-script-repair.ts';

// Unified Strategy System (AI-driven selection across TS + TASK.md)
export {
  UnifiedStrategyRegistry,
  gatherContext,
  buildSelectionPrompt,
  getBuiltinDescriptors,
} from './strategy-catalog.ts';
export type {
  StrategyDescriptor,
  ContextStep,
  GatheredContext,
  AISelectionResult,
} from './strategy-catalog.ts';

// Skill-based repair (installer for repair TASK.md templates)
export { installRepairSkills, hasRepairSkills, listRepairSkills } from './skill-installer.ts';

// Health Check Hooks
export { taskCompletionHealthCheck, wbsSpawnReview, registerHealthCheckHooks } from './health-checks.ts';

// Navigator Graph (graph-driven state machine)
export { converge } from './navigator/navigator.ts';
export type { ConvergeOptions, ConvergeResult } from './navigator/navigator.ts';
export { NavigatorGraph } from './navigator/graph.ts';
export { buildInitialNodes, GOAL_CONDITIONS } from './navigator/default-graph.ts';
export { buildActionRegistry } from './navigator/actions.ts';
export type { GraphNode, GraphEdge, Graph, Snapshot, WalkResult, GoalCondition, NodeStatus, NodeOrigin } from './navigator/types.ts';
export { evalPredicate, listPredicates } from './navigator/predicates.ts';

