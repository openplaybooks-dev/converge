/**
 * Converge V2 - Gap-Driven Framework
 *
 * Main export file. Start with the User API section below,
 * then reach into the Internal API as needed for advanced use cases.
 */

/* ════════════════════════════════════════════════════════════════════ */
/*  ★  PRIMARY USER API  —  Start here                                  */
/*                                                                      */
/*  1. PROJECT.md         — YAML frontmatter config (.converge/PROJECT.md) */
/*  2. HookRegistry      — Lifecycle hooks for the full workflow         */
/*  3. DiscoveryScanner  — Auto-discover tasks/epics from glob patterns  */
/*  4. Builder API below — project(), epic(), taskDef(), check(), plan() */
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
} from "./discovery/scanner.ts";
export {
  DiscoveryWatcher,
  createDiscoveryWatcher,
} from "./discovery/watcher.ts";

export type {
  DiscoveredFile,
  DiscoveryResult,
  DiscoveredFileType,
  DiscoveryChangeEvent,
  DiscoveryChangeType,
} from "./discovery/types.ts";

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
} from "./gap/types.ts";

export { toCompactGap, formatCompactGaps } from "./gap/types.ts";

export {
  GapDetector,
  ConvergenceAnalyzer,
  createGapDetector,
  createConvergenceAnalyzer,
} from "./gap/detector.ts";

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
} from "./gap/utils.ts";

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
} from "./goal/types.ts";

export {
  GoalEvaluatorImpl,
  extractTasksFromUnsatisfiedGoals,
  flattenGoalHierarchy,
  countGoals,
  findGoalById,
} from "./goal/evaluator.ts";

export { goal, defineGoal } from "./goal/builder.ts";

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

export { Unit } from "./unit/index.ts";
export type {
  UnitConfig as V2UnitConfig,
  CheckResult as V2CheckResult,
} from "./unit/index.ts";

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

export { autonomousRun as v2AutonomousRun } from "./cli/autonomous-run.ts";
export type { AutonomousRunConfig as V2AutonomousRunConfig } from "./cli/autonomous-run.ts";

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
} from "./functions/types.ts";

export {
  check,
  evalFn as eval,
  plan,
  task,
  taskDef as v1TaskDef, // Rename V1 to avoid conflict
  project,
  defineProject,
} from "./functions/builders.ts";

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
} from "./functions/registry.ts";

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
} from "./functions/types.ts";

export { YieldsProcessor, createYieldsProcessor } from "./yields/processor.ts";

export { YieldsSpawner, createYieldsSpawner } from "./yields/spawner.ts";

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
} from "./auto-verify/types.ts";

export {
  ConvergeSynthesizer,
  createConvergeSynthesizer,
} from "./auto-verify/synthesizer.ts";

export {
  ConvergeExecutor,
  createConvergeExecutor,
} from "./auto-verify/executor.ts";

export {
  ConvergeRefiner,
  createConvergeRefiner,
} from "./auto-verify/refiner.ts";

export { ConvergeCache, createConvergeCache } from "./auto-verify/cache.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Subtasks                                                          */
/* ────────────────────────────────────────────────────────────────── */

export type { SubtasksConfig, SubtasksGeneratorFn } from "./subtasks/types.ts";

export {
  SubtasksProcessor,
  createSubtasksProcessor,
} from "./subtasks/processor.ts";

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
} from "./playbook/types.ts";

export type { PlaybookPaths } from "./playbook/paths.ts";
export { resolvePlaybookPaths, getSourceTaskDirs } from "./playbook/paths.ts";

export {
  parsePlaybookYml,
  validatePlaybook,
  discoverPlaybooks,
  loadPlaybook,
  resolvePlaybook,
  parseDuration,
  substituteVars,
} from "./playbook/loader.ts";

export {
  generateEpicFromPlaybook,
  mergeRunConfig,
} from "./playbook/executor.ts";

export {
  initPlaybookJournal,
  appendTrend,
  readTrends,
  getPlaybookJournalDir,
} from "./playbook/journal.ts";

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
