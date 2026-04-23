/**
 * @converge/core - Gap-Driven Framework for AI Workflows
 *
 * This is the programmatic API for Converge. For CLI usage, install globally
 * and run `converge --help`.
 *
 * @example
 * ```typescript
 * import { taskDef, createRuntime } from '@converge/core';
 *
 * const task = taskDef({
 *   id: 'analyze',
 *   title: 'Analyze codebase',
 *   outputs: ['analysis.md'],
 *   executor: async (ctx) => {
 *     // Your logic here
 *   }
 * });
 *
 * const runtime = createRuntime({ dir: process.cwd() });
 * await runtime.executeTask(task);
 * ```
 *
 * @packageDocumentation
 */

/* ════════════════════════════════════════════════════════════════════ */
/*  ★  PRIMARY API  —  Start here                                       */
/*                                                                      */
/*  Core Concepts:                                                      */
/*  • taskDef()          — Define tasks programmatically                */
/*  • project()          — Define projects with task hierarchies        */
/*  • createRuntime()    — Execute tasks and orchestrate workflows      */
/*  • HookRegistry       — Lifecycle hooks for workflow events          */
/*  • DiscoveryScanner   — Auto-discover tasks from filesystem          */
/*  • Gap Detection      — Detect and close gaps between current/target */
/*                                                                      */
/*  For CLI usage: npm install -g @converge/core && converge --help    */
/* ════════════════════════════════════════════════════════════════════ */

/* ── Config ─────────────────────────────────────────────────────── */

export type {
  ConvergeConfig,
  DiscoveryConfig,
  RuntimeConfig,
  AIConfig,
  AIMultiProviderConfig,
  ClaudeProviderConfig,
  ACPProviderConfig,
  KimiProviderConfig,
} from "./config/types.ts";

export {
  findConvergeConfig,
  loadConvergeConfig,
  resolveConvergeConfig,
} from "./config/loader.ts";

export { validateConvergeConfig } from "./config/validator.ts";

/* ── Hooks ──────────────────────────────────────────────────────── */

/**
 * Register, fire, and manage lifecycle hooks.
 * Injected into orchestrators automatically when `PROJECT.md` is used.
 */
export { HookRegistry, globalHookRegistry } from "./hooks/registry.ts";

export type {
  HookEvent,
  HookFn,
  HookPayloads,
  ConvergeHooks,
  HookRegistration,
  LegacyHookFn,
} from "./hooks/types.ts";

/* ── Discovery ──────────────────────────────────────────────────── */

/**
 * Glob-based auto-discovery of task/epic/check/plan files.
 * Supersedes the static-path `TaskFileScanner` for new projects.
 */
export {
  DiscoveryScanner,
  createDiscoveryScanner,
} from "./task/discovery/scanner.ts";
export {
  DiscoveryWatcher,
  createDiscoveryWatcher,
} from "./task/discovery/watcher.ts";

export type {
  DiscoveredFile,
  DiscoveryResult,
  DiscoveredFileType,
  DiscoveryChangeEvent,
  DiscoveryChangeType,
} from "./task/discovery/types.ts";

/* ── Structured Logger ──────────────────────────────────────────── */

export { createLogger, createDefaultLogger } from "./runtime/logger.ts";

/* ════════════════════════════════════════════════════════════════════ */
/*  ★  BUILDER API  —  Fluent project/epic/task definition              */
/* ════════════════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────────────────────── */
/*  Storage                                                            */
/* ────────────────────────────────────────────────────────────────── */

export type {
  ProjectConfig,
  TaskConfig,
  TaskStatus,
  GapType,
  Gap,
  GapSnapshot,
  Checkpoint,
  ProvenanceRecord,
  StoragePaths,
  AIProviderConfig,
} from "./storage/types.ts";

export {
  ProjectConfigSchema,
  TaskConfigSchema,
  TaskStatusSchema,
  createStoragePaths,
  AIConfigSchema,
  AIProviderConfigSchema,
  AIMultiProviderConfigSchema,
} from "./storage/types.ts";

export {
  FilesystemStorage,
  createFilesystemStorage,
} from "./storage/filesystem.ts";

export { StatusManager, createStatusManager } from "./storage/status.ts";

export {
  ProvenanceManager,
  createProvenanceManager,
} from "./storage/provenance.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Gap Framework                                                      */
/* ────────────────────────────────────────────────────────────────── */

export type {
  CheckResult,
  EvalResult,
  ConvergenceState,
  GapDetectionConfig,
  GapPriority,
  PrioritizationStrategy,
  CompactGap,
} from "./task/gap/types.ts";

export { toCompactGap, formatCompactGaps } from "./task/gap/types.ts";

export {
  GapDetector,
  ConvergenceAnalyzer,
  createGapDetector,
  createConvergenceAnalyzer,
} from "./task/gap/detector.ts";

export {
  createGap,
  resolveGap,
  filterByType,
  filterByLevel,
  filterBySeverity,
  filterUnresolved,
  prioritizeGaps,
  sortByPriority,
  calculateGapStats,
  formatGapStats,
} from "./task/gap/utils.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Goals                                                              */
/* ────────────────────────────────────────────────────────────────── */

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
} from "./task/goal/types.ts";

export {
  GoalEvaluatorImpl,
  extractTasksFromUnsatisfiedGoals,
  flattenGoalHierarchy,
  countGoals,
  findGoalById,
} from "./task/goal/evaluator.ts";

export { goal, defineGoal } from "./task/goal/builder.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Runtime                                                            */
/* ────────────────────────────────────────────────────────────────── */

export type {
  Runtime,
  GoalManager,
  TaskManager,
  ProjectManager,
} from "./runtime/types.ts";

export { RuntimeImpl, createRuntime } from "./runtime/runtime.ts";

export { GoalManagerImpl } from "./runtime/goal-manager.ts";

export { TaskManagerImpl } from "./runtime/task-manager.ts";

export { ProjectManagerImpl } from "./runtime/project-manager.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  V2 Universal Unit Architecture                                    */
/* ────────────────────────────────────────────────────────────────── */

export { Unit } from "./task/unit/index.ts";
export type {
  UnitConfig as V2UnitConfig,
  CheckResult as V2CheckResult,
} from "./task/unit/index.ts";

export {
  taskDef, // V2 is now the default taskDef
  taskDef as v2TaskDef,
  TaskDefinitionBuilder,
  TaskDefinitionBuilder as V2TaskDefinitionBuilder,
  mcpServer,
  rawMd,
  template,
} from "./config/task-definition.ts";
export type {
  TaskDefinition as V2TaskDefinition,
  ProjectDefinition as V2ProjectDefinition,
  TaskLevelDefinition as V2TaskLevelDefinition,
  SubtaskDefinition as V2SubtaskDefinition,
  ChecklistDefinition as V2ChecklistDefinition,
  Check,
  TaskContext as V2TaskContext,
  AskResult,
  Need,
  McpServerNeed,
  RawMarkdown,
  TemplateRef,
  ExecutorFn,
  ExecutorContext,
  WbsFn,
  WbsContext,
} from "./config/task-definition.ts";

export {
  isProjectDefinition as v2IsProjectDefinition,
  isTaskDefinition as v2IsTaskDefinition,
  hasYields as v2HasYields,
  isLeafDefinition as v2IsLeafDefinition,
  isChecklistDefinition as v2IsChecklistDefinition,
} from "./config/task-definition.ts";

// CLI exports removed - use @converge/cli package instead

/* ────────────────────────────────────────────────────────────────── */
/*  Metrics                                                            */
/* ────────────────────────────────────────────────────────────────── */

export type {
  BenchmarkResult,
  SessionMetrics,
  AggregateMetrics,
  CheckpointSummary,
  ConvergenceData,
} from "./metrics/types.ts";
export { exportBenchmarkResults } from "./metrics/extract.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Context                                                            */
/* ────────────────────────────────────────────────────────────────── */

export type {
  BaseContext,
  ProjectContext,
  TaskContext,
  FileSystemAPI,
  ShellAPI,
  ShellExecOptions,
  ShellResult,
  GitAPI,
  LoggerAPI,
  EvalAPI,
  PlanAPI,
  CheckAPI,
  PluginAPI,
} from "./context/types.ts";

export {
  createProjectContext,
  createTaskContext,
} from "./context/index.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Functions                                                          */
/* ────────────────────────────────────────────────────────────────── */

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
  TaskDefBuilder,
  ProjectBuilder,
  ProjectDefinition,
} from "./task/checks/types.ts";

export {
  check,
  evalFn as eval,
  plan,
  task,
  taskDef as v1TaskDef, // Rename V1 to avoid conflict
  project,
  defineProject,
} from "./task/checks/builders.ts";

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
} from "./task/checks/registry.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Plugins                                                            */
/* ────────────────────────────────────────────────────────────────── */

export type {
  ConvergePluginV2,
  PluginAPIV2,
  ToolFactory,
  PluginEntry,
  PluginStateV2,
  PluginManifestV2,
} from "./plugins/types.ts";

export {
  loadPluginsV2,
  formatPluginListV2,
  listBuiltinPluginsV2,
} from "./plugins/loader.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Executor                                                           */
/* ────────────────────────────────────────────────────────────────── */

export type {
  ExecutionOptions,
  ExecutionResult,
} from "./executor/function-executor.ts";

export {
  FunctionExecutor,
  BatchExecutor,
  createFunctionExecutor,
  createBatchExecutor,
  DEFAULT_EXECUTION_OPTIONS,
} from "./executor/function-executor.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Orchestrator                                                       */
/* ────────────────────────────────────────────────────────────────── */

export type {
  ConvergenceConfig,
  ConvergenceResult,
} from "./orchestrator/convergence.ts";

export {
  ConvergenceOrchestrator,
  createConvergenceOrchestrator,
  DEFAULT_CONVERGENCE_CONFIG,
} from "./orchestrator/convergence.ts";

export type { ProjectOrchestrationResult } from "./orchestrator/project-orchestrator.ts";

export {
  ProjectOrchestratorV2,
  createProjectOrchestratorV2,
} from "./orchestrator/project-orchestrator.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Planner                                                            */
/* ────────────────────────────────────────────────────────────────── */

export type { PlanningStrategy } from "./planning/dynamic-planner.ts";

export {
  DynamicPlanner,
  AdaptivePlanner,
  createDynamicPlanner,
  createAdaptivePlanner,
} from "./planning/dynamic-planner.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Resume                                                             */
/* ────────────────────────────────────────────────────────────────── */

export type { ResumePoint } from "./resume/resumability.ts";

export {
  ResumabilityManager,
  createResumabilityManager,
} from "./resume/resumability.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Planning (Phase 0 - Autonomous Planning Engine)                   */
/* ────────────────────────────────────────────────────────────────── */

export type {
  PlanGenerationConfig,
  PlanGenerationResult,
  ReplanResult,
  ReplanContext,
  ReplanTrigger,
  GapFillResult,
  GapFillContext,
  FeedbackHistory,
  FeedbackAttempt,
  TaskFileMetadata,
  ScannerConfig,
  ScanResult,
} from "./planning/types.ts";

export {
  TaskFileScanner,
  createTaskFileScanner,
} from "./planning/task-scanner.ts";

export {
  TaskFileGenerator,
  createTaskFileGenerator,
} from "./planning/task-file-generator.ts";

export { ReplanEngine, createReplanEngine } from "./planning/replan-engine.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Yields (Phase 1 - Enhanced Yields API)                            */
/* ────────────────────────────────────────────────────────────────── */

export type {
  YieldsConfig,
  YieldsDeclarative,
  YieldsFn,
  YieldsStatic,
} from "./task/checks/types.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Converge (Phase 2 - AutoConverge Generation System)                 */
/* ────────────────────────────────────────────────────────────────── */

export type {
  AutoConvergeConfig,
  ConvergeIssue,
  ConvergeResult,
  ConvergeMetadata,
  ConvergeVerdict,
  ConvergeSandboxAPI,
  ConvergeSynthesisRequest,
  SynthesizedVerification,
  RefinementRequest,
  RefinementResult,
} from "./synthesis/types.ts";

export {
  ConvergeSynthesizer,
  createConvergeSynthesizer,
} from "./synthesis/synthesizer.ts";

export {
  ConvergeExecutor,
  createConvergeExecutor,
} from "./synthesis/executor.ts";

export {
  ConvergeRefiner,
  createConvergeRefiner,
} from "./synthesis/refiner.ts";

export { ConvergeCache, createConvergeCache } from "./synthesis/cache.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Subtasks                                                          */
/* ────────────────────────────────────────────────────────────────── */

export type { SubtasksConfig, SubtasksGeneratorFn } from "./task/subtasks/types.ts";

export {
  SubtasksProcessor,
  createSubtasksProcessor,
} from "./task/subtasks/processor.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Meta-Optimization (Self-Improvement Loop)                         */
/* ────────────────────────────────────────────────────────────────── */

export { MetaAnalyzer, MetaOptimizationSidecar } from "./meta/index.ts";

export type {
  MetaAnalyzerConfig,
  TaskJournalEntry,
  MetaAnalysisStats,
  ImprovementProposal,
  SidecarConfig as MetaSidecarConfig,
} from "./meta/index.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  TASK.md Parser                                                    */
/* ────────────────────────────────────────────────────────────────── */

export {
  parseTaskMd,
  parseTaskMdString,
  mapTaskMdToTaskDefinition,
} from "./config/task-md-definition.ts";

export type {
  TaskMdDef,
  TaskMdShape,
  TaskMdExecutor,
  TaskMdWbs,
  TaskMdPlan,
} from "./config/task-md-definition.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Validation                                                         */
/* ────────────────────────────────────────────────────────────────── */

export {
  validateTaskMd,
  validateProject,
  validateTaskMdFile,
  validateProjectMd,
  validateProjectMdFile,
} from "./validation/validate.ts";

export type {
  ValidationIssue,
  TaskValidationResult,
  ProjectValidationResult,
  ProjectMdValidationResult,
  ValidationRule,
  ProjectValidationRule,
  ValidationLayer,
  Severity,
  TaskValidationInput,
} from "./validation/types.ts";

export { formatRules } from "./validation/rules/format.ts";
export { structureRules } from "./validation/rules/structure.ts";
export { syntaxRules } from "./validation/rules/syntax.ts";
export { projectRules } from "./validation/rules/project.ts";
export { projectMdRules } from "./validation/rules/project-md.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Script WBS Executor                                               */
/* ────────────────────────────────────────────────────────────────── */

export {
  createScriptWbsFn,
  createAiWbsFn,
} from "./executor/script-wbs-executor.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Shared Sub-parsers (reused by TASK.md)                            */
/* ────────────────────────────────────────────────────────────────── */

export {
  parseChecks,
  parseAutoConverge,
  parseDiagnosisHints,
  parseContextSteps,
} from "./config/skill-definition.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Playbooks (Unified Workflows + Run Config)                       */
/* ────────────────────────────────────────────────────────────────── */

export type {
  PlaybookDef,
  PlaybookInput,
  PlaybookRunConfig,
  PlaybookCheck,
  PlaybookSource,
  ResolvedPlaybook,
  PlaybookContext,
  PlaybookTrendEntry,
} from "./task/playbook/types.ts";

export type { PlaybookPaths } from "./task/playbook/paths.ts";
export { resolvePlaybookPaths, getSourceTaskDirs } from "./task/playbook/paths.ts";

export {
  parsePlaybookYml,
  validatePlaybook,
  discoverPlaybooks,
  loadPlaybook,
  resolvePlaybook,
  parseDuration,
  substituteVars,
} from "./task/playbook/loader.ts";

export { mergeRunConfig } from "./task/playbook/executor.ts";

export {
  initPlaybookJournal,
  appendTrend,
  readTrends,
  getPlaybookJournalDir,
} from "./task/playbook/journal.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  AI Factory                                                        */
/* ────────────────────────────────────────────────────────────────── */

export {
  createAIFactory,
  createProjectAI,
  createDefaultAI,
  resolveAIConfig,
  listAIProviders,
} from "./ai/factory.ts";

export type { AICaller, ResolvedAIConfig, AIProvider } from "./ai/factory.ts";

export { AIContext, AIResponse, createAIContext } from "./ai/context.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Legacy Compat — deprecated, use TASK.md equivalents              */
/* ────────────────────────────────────────────────────────────────── */

/** @deprecated Use parseTaskMd instead */
export { parseSkillMd } from "./config/skill-definition.ts";
/** @deprecated Use TaskMdDef instead */
export type { SkillTaskDef } from "./config/skill-definition.ts";
