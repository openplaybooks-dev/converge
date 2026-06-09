/**
 * @openplaybooks/converge-core - Gap-Driven Framework for AI Workflows
 *
 * This is the programmatic API for Converge. For CLI usage, install
 * `@openplaybooks/converge` globally and run `converge --help`.
 *
 * @example
 * ```typescript
 * import { taskDef, createRuntime } from '@openplaybooks/converge-core';
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
/*  For CLI usage: npm install -g @openplaybooks/converge && converge --help     */
/* ════════════════════════════════════════════════════════════════════ */

/* ── DAG (Declarative Discovery) ────────────────────────────────── */

export { TaskDag } from "./dag/index.js";
export { topologicalSort, detectCycle } from "./dag/index.js";
export { executeDag, runDag } from "./dag/index.js";
export type { DagNode, DagNodeStatus } from "./dag/index.js";
export type { DagRunnerOpts, SpawnedChild } from "./dag/index.js";

export { buildDagFromInventory } from "./run/playbook-compile.js";
export { PathRegistry } from "./config/path-registry.js";
export {
  buildDagFromPlaybookObject,
  buildDagFromManifest,
  injectRootNodes,
} from "./manifest/build-dag.js";

/* ── Checkpoint / State ─────────────────────────────────────────── */

export { TaskStateManager } from "./checkpoint/state.js";

/* ── Journal ──────────────────────────────────────────────────────── */

export { getJournalStructure, getEpicsDir } from "./journal/structure.js";
export { getInventoryDir } from "./journal/structure.js";
export { syncStaticTasksFromDisk } from "./run/playbook-compile.js";

/* ── Hash ─────────────────────────────────────────────────────────── */

export { hashUpstream } from "./hash/index.js";

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
export { InterceptorRegistry } from "./hooks/interceptor-registry.ts";
export type {
  InterceptorFn,
  InterceptEvent,
} from "./hooks/interceptor-registry.ts";

export type {
  HookEvent,
  HookFn,
  HookPayloads,
  ConvergeHooks,
  HookRegistration,
} from "./hooks/types.ts";

/* ── Hook Definitions (tag-matched companion DAG nodes) ──────────── */

export { hookDef, HookDefinitionBuilder } from "./hooks/hook-definition.ts";
export type {
  HookDefinition,
  HookContext,
  HookExecutorFn,
  HookFilter,
} from "./hooks/hook-definition.ts";

/* ── Hook Builtins ──────────────────────────────────────────────── */

export { gitCommitHook, prCreateHook } from "./hooks/builtins/git.ts";
export type {
  GitCommitHookConfig,
  PrCreateHookConfig,
} from "./hooks/builtins/git.ts";

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

/* ── Runtime Ledger (tasks.jsonl / goals.jsonl) ─────────────────── */
/**
 * Direct access to the append-only runtime ledger. Used by tasks and
 * by external test harnesses to read/write per-task metadata (e.g. the
 * framework-managed `wave` counter).
 */
export {
  appendTaskStatus,
  appendTaskUpsert,
  ensureRuntimeLedger,
  readRuntimeLedgerState,
} from "./task/goal/runtime-ledger.ts";
export { TaskTopology } from "./task/goal/task-topology.ts";

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

/* ────────────────────────────────────────────────────────────────── */
/*  Runtime                                                            */
/* ────────────────────────────────────────────────────────────────── */

// `Runtime` / `RuntimeImpl` / `createRuntime` are not exported.
// Their `run()` / `checkpoint()` / `resume()` methods were unimplemented
// stubs. Use `run(playbook, opts)` from `./run.ts` instead — the only
// execution entry point. See `docs/design/programmatic-core-and-planner.md`.
//
// `TaskManager` / `ProjectManager` types remain internal — they're
// composition details of the in-memory project shape, not user-facing.

export type { TaskManager, ProjectManager } from "./runtime/types.ts";

export { TaskManagerImpl } from "./runtime/task-manager.ts";

export { ProjectManagerImpl } from "./runtime/project-manager.ts";

/* ── Programmatic execution surface ─────────────────────────────── */

export { run, consoleReporter, captureReporter } from "./run/index.js";
export { resolvePartitionKey } from "./run/partition.js";
export type { RunEvent, Reporter, RunOptions, RunResult } from "./run/index.js";

// RFC 0050 — durable code-first runtime (visible imperative flow, resumable mid-flight).
export {
  runFlow,
  loadFlowModule,
  StepJournal,
  KeyCounter,
  deriveKey,
} from "./run/flow/index.js";
export type {
  FlowDefinition,
  FlowContext,
  RunFlowOptions,
  FlowTaskRegistry,
  FlowRegistryTask,
  InlineFlowTask,
  TaskRef,
  ResolvedFlowTask,
  StepRecord,
} from "./run/flow/index.js";

export {
  definePlaybook,
  loadPlaybookFromFolder,
  loadPlaybookByName,
  writePlaybookToFolder,
  listTaskFiles,
  readTaskMd,
} from "./playbook.ts";
export type { Playbook, DefinePlaybookConfig } from "./playbook.ts";

export { plan } from "./plan.ts";
export type { PlanOptions } from "./plan.ts";

export {
  definePlannerPlaybook,
  slugifyPrompt,
  suggestPlaybookName,
} from "./playbooks/planner/index.ts";
export type { DefinePlannerPlaybookOpts } from "./playbooks/planner/index.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  V2 Universal Unit Architecture                                    */
/* ────────────────────────────────────────────────────────────────── */

export { Unit } from "./task/unit/index.ts";
export type { UnitConfig } from "./task/unit/index.ts";

export {
  taskDef,
  TaskDefinitionBuilder,
  seeds,
  tests,
  mcpServer,
  rawMd,
  template,
} from "./config/task-definition.ts";
export type {
  TaskDefinition,
  TaskLevelDefinition,
  SubtaskDefinition,
  ChecklistDefinition,
  Check,
  SeedSpec,
  TestSpec,
  AskResult,
  Need,
  McpServerNeed,
  RawMarkdown,
  TemplateRef,
  ExecutorFn,
  ExecutorContext,
  SeedFn,
  SeedContext,
} from "./config/task-definition.ts";

export {
  isProjectDefinition,
  isTaskDefinition,
  hasYields,
  isPlainTask,
  isChecklistDefinition,
} from "./config/task-definition.ts";

// CLI exports removed - use @openplaybooks/converge package instead

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

export { createProjectContext, createTaskContext } from "./context/index.ts";

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

export { check, task, project } from "./task/checks/builders.ts";

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
  CheckTypeEvaluator,
  CheckEvalContext,
  CheckRunResult,
  SkillSource,
  JournalConsumer,
  PluginCommand,
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

export { ConvergeRefiner, createConvergeRefiner } from "./synthesis/refiner.ts";

export { ConvergeCache, createConvergeCache } from "./synthesis/cache.ts";

/* ────────────────────────────────────────────────────────────────── */
/*  Subtasks                                                          */
/* ────────────────────────────────────────────────────────────────── */

export type {
  SubtasksConfig,
  SubtasksGeneratorFn,
} from "./task/subtasks/types.ts";

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
  serializeTaskMd,
  mapTaskMdToTaskDefinition,
} from "./config/task-md-definition.ts";

export type {
  TaskMdDef,
  TaskMdShape,
  TaskMdExecutor,
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
  validatePlaybook,
  validateAllPlaybooks,
} from "./validation/validate.ts";

export type {
  ValidationIssue,
  TaskValidationResult,
  ProjectValidationResult,
  ProjectMdValidationResult,
  PlaybookValidationResult,
  AllPlaybooksValidationResult,
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
export {
  playbookFormatRules,
  playbookStructureRules,
  playbookIntegrityRules,
  allPlaybookRules,
} from "./validation/rules/playbook.ts";

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
  PlaybookGoal,
  PlaybookGoalCheck,
  PlaybookRunConfig,
  PlaybookSource,
  ResolvedPlaybook,
  PlaybookContext,
  PlaybookTrendEntry,
} from "./task/playbook/types.ts";

export type { PlaybookPaths } from "./task/playbook/paths.ts";
export {
  resolvePlaybookPaths,
  getSourceTaskDirs,
} from "./task/playbook/paths.ts";

export {
  parsePlaybookYml,
  validatePlaybook as validatePlaybookFolders,
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

/* ── V2 Playbook API (hash tracking, sync, templates, repair) ─────── */

export {
  calculatePlaybookHash,
  writePlaybookHash,
  readPlaybookHash,
  updatePlaybookHash,
  checkPlaybookStatus,
  syncJournalHash,
  clearJournal,
  syncPlaybookToJournal,
  syncAllPlaybooks,
  type PlaybookHashInfo,
  type PlaybookSyncStatus,
  type PlaybookChanges,
  type PlaybookStatusResult,
  type SyncResult,
} from "./playbook/index.ts";

export {
  materializeTemplate,
  materializeTemplates,
  extractTemplateVariables,
  validateTemplateVariables,
  type MaterializeOptions,
} from "./playbook/template-materializer.ts";
