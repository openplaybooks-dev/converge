# @converge/core - Export Reference

Complete reference of all exports from `@converge/core`.

## Main Exports (`@converge/core`)

### Configuration

```typescript
import {
  // Types
  type ConvergeConfig,
  type DiscoveryConfig,
  type RuntimeConfig,
  type AIConfig,
  type AIMultiProviderConfig,
  type ClaudeProviderConfig,
  type ACPProviderConfig,
  type KimiProviderConfig,
  
  // Functions
  findConvergeConfig,
  loadConvergeConfig,
  resolveConvergeConfig,
  validateConvergeConfig,
} from '@converge/core';
```

### Task Definition (V2 - Recommended)

```typescript
import {
  // Builder
  taskDef,
  TaskDefinitionBuilder,
  mcpServer,
  rawMd,
  template,
  
  // Types
  type TaskDefinition,
  type ProjectDefinition,
  type TaskLevelDefinition,
  type SubtaskDefinition,
  type ChecklistDefinition,
  type Check,
  type TaskContext,
  type AskResult,
  type Need,
  type McpServerNeed,
  type RawMarkdown,
  type TemplateRef,
  type ExecutorFn,
  type ExecutorContext,
  type WbsFn,
  type WbsContext,
  
  // Type Guards
  isProjectDefinition,
  isTaskDefinition,
  hasYields,
  isLeafDefinition,
  isChecklistDefinition,
} from '@converge/core';
```

### Task Definition (V1 - Legacy)

```typescript
import {
  // Builders
  check,
  eval,
  plan,
  task,
  project,
  defineProject,
  
  // Types
  type CheckFn,
  type CheckFnMeta,
  type EvalFn,
  type EvalFnMeta,
  type PlanFn,
  type PlanFnMeta,
  type TaskFn,
  type TaskFnMeta,
  type TaskResult,
  type FunctionRegistry,
  type FunctionRegistration,
  type TaskDefBuilder,
  type ProjectBuilder,
} from '@converge/core';
```

### Runtime

```typescript
import {
  // Runtime
  type Runtime,
  RuntimeImpl,
  createRuntime,
  
  // Managers
  type GoalManager,
  GoalManagerImpl,
  type TaskManager,
  TaskManagerImpl,
  type ProjectManager,
  ProjectManagerImpl,
  
  // Logger
  createLogger,
  createDefaultLogger,
} from '@converge/core';
```

### Storage

```typescript
import {
  // Types
  type ProjectConfig,
  type TaskConfig,
  type TaskStatus,
  type GapType,
  type Gap,
  type GapSnapshot,
  type Checkpoint,
  type ProvenanceRecord,
  type StoragePaths,
  type AIProviderConfig,
  
  // Schemas
  ProjectConfigSchema,
  TaskConfigSchema,
  TaskStatusSchema,
  AIConfigSchema,
  AIProviderConfigSchema,
  AIMultiProviderConfigSchema,
  
  // Functions
  createStoragePaths,
  FilesystemStorage,
  createFilesystemStorage,
  StatusManager,
  createStatusManager,
  ProvenanceManager,
  createProvenanceManager,
} from '@converge/core';
```

### Gap Detection

```typescript
import {
  // Types
  type CheckResult,
  type EvalResult,
  type ConvergenceState,
  type GapDetectionConfig,
  type GapPriority,
  type PrioritizationStrategy,
  type CompactGap,
  
  // Functions
  GapDetector,
  ConvergenceAnalyzer,
  createGapDetector,
  createConvergenceAnalyzer,
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
  toCompactGap,
  formatCompactGaps,
} from '@converge/core';
```

### Goals

```typescript
import {
  // Types
  type Goal,
  type GoalStatus,
  type GoalHierarchy,
  type GoalNode,
  type GoalEvaluator,
  type GoalEvaluationContext,
  type GoalBuilder,
  type GoalSatisfactionStrategy,
  type GoalSatisfactionPlan,
  type GoalConvergenceConfig,
  type GoalProgressUpdate,
  type GoalConvergenceResult,
  
  // Functions
  GoalEvaluatorImpl,
  extractTasksFromUnsatisfiedGoals,
  flattenGoalHierarchy,
  countGoals,
  findGoalById,
  goal,
  defineGoal,
} from '@converge/core';
```

### Hooks

```typescript
import {
  // Types
  type HookEvent,
  type HookFn,
  type HookPayloads,
  type ConvergeHooks,
  type HookRegistration,
  type LegacyHookFn,
  
  // Registry
  HookRegistry,
  globalHookRegistry,
} from '@converge/core';
```

### Discovery

```typescript
import {
  // Types
  type DiscoveredFile,
  type DiscoveryResult,
  type DiscoveredFileType,
  type DiscoveryChangeEvent,
  type DiscoveryChangeType,
  
  // Scanner
  DiscoveryScanner,
  createDiscoveryScanner,
  
  // Watcher
  DiscoveryWatcher,
  createDiscoveryWatcher,
} from '@converge/core';
```

### Orchestration

```typescript
import {
  // Convergence
  type ConvergenceConfig,
  type ConvergenceResult,
  ConvergenceOrchestrator,
  createConvergenceOrchestrator,
  DEFAULT_CONVERGENCE_CONFIG,
  
  // Project
  type ProjectOrchestrationResult,
  ProjectOrchestratorV2,
  createProjectOrchestratorV2,
} from '@converge/core';
```

### Execution

```typescript
import {
  // Types
  type ExecutionOptions,
  type ExecutionResult,
  
  // Executors
  FunctionExecutor,
  BatchExecutor,
  createFunctionExecutor,
  createBatchExecutor,
  DEFAULT_EXECUTION_OPTIONS,
} from '@converge/core';
```

### Planning

```typescript
import {
  // Types
  type PlanGenerationConfig,
  type PlanGenerationResult,
  type ReplanResult,
  type ReplanContext,
  type ReplanTrigger,
  type GapFillResult,
  type GapFillContext,
  type FeedbackHistory,
  type FeedbackAttempt,
  type TaskFileMetadata,
  type ScannerConfig,
  type ScanResult,
  type PlanningStrategy,
  
  // Functions
  TaskFileScanner,
  createTaskFileScanner,
  TaskFileGenerator,
  createTaskFileGenerator,
  ReplanEngine,
  createReplanEngine,
  DynamicPlanner,
  AdaptivePlanner,
  createDynamicPlanner,
  createAdaptivePlanner,
} from '@converge/core';
```

### Context

```typescript
import {
  // Types
  type BaseContext,
  type ProjectContext,
  type TaskContext,
  type FileSystemAPI,
  type ShellAPI,
  type ShellExecOptions,
  type ShellResult,
  type GitAPI,
  type LoggerAPI,
  type EvalAPI,
  type PlanAPI,
  type CheckAPI,
  type PluginAPI,
  
  // Functions
  createProjectContext,
  createTaskContext,
} from '@converge/core';
```

### AI

```typescript
import {
  // Types
  type AICaller,
  type ResolvedAIConfig,
  type AIProvider,
  type AIContext,
  type AIResponse,
  
  // Functions
  createAIFactory,
  createProjectAI,
  createDefaultAI,
  resolveAIConfig,
  listAIProviders,
  createAIContext,
} from '@converge/core';
```

### Playbooks

```typescript
import {
  // Types
  type PlaybookDef,
  type PlaybookInput,
  type PlaybookRunConfig,
  type PlaybookCheck,
  type PlaybookSource,
  type ResolvedPlaybook,
  type PlaybookContext,
  type PlaybookTrendEntry,
  type PlaybookPaths,
  
  // Functions
  parsePlaybookYml,
  validatePlaybook,
  discoverPlaybooks,
  loadPlaybook,
  resolvePlaybook,
  parseDuration,
  substituteVars,
  mergeRunConfig,
  resolvePlaybookPaths,
  getSourceTaskDirs,
  initPlaybookJournal,
  appendTrend,
  readTrends,
  getPlaybookJournalDir,
} from '@converge/core';
```

### Validation

```typescript
import {
  // Types
  type ValidationIssue,
  type TaskValidationResult,
  type ProjectValidationResult,
  type ProjectMdValidationResult,
  type ValidationRule,
  type ProjectValidationRule,
  type ValidationLayer,
  type Severity,
  type TaskValidationInput,
  
  // Functions
  validateTaskMd,
  validateProject,
  validateTaskMdFile,
  validateProjectMd,
  validateProjectMdFile,
  
  // Rules
  formatRules,
  structureRules,
  syntaxRules,
  projectRules,
  projectMdRules,
} from '@converge/core';
```

### Synthesis (AutoConverge)

```typescript
import {
  // Types
  type AutoConvergeConfig,
  type ConvergeIssue,
  type ConvergeResult,
  type ConvergeMetadata,
  type ConvergeVerdict,
  type ConvergeSandboxAPI,
  type ConvergeSynthesisRequest,
  type SynthesizedVerification,
  type RefinementRequest,
  type RefinementResult,
  
  // Functions
  ConvergeSynthesizer,
  createConvergeSynthesizer,
  ConvergeExecutor,
  createConvergeExecutor,
  ConvergeRefiner,
  createConvergeRefiner,
  ConvergeCache,
  createConvergeCache,
} from '@converge/core';
```

### Subtasks

```typescript
import {
  // Types
  type SubtasksConfig,
  type SubtasksGeneratorFn,
  
  // Functions
  SubtasksProcessor,
  createSubtasksProcessor,
} from '@converge/core';
```

### Metrics

```typescript
import {
  // Types
  type BenchmarkResult,
  type SessionMetrics,
  type AggregateMetrics,
  type CheckpointSummary,
  type ConvergenceData,
  
  // Functions
  exportBenchmarkResults,
} from '@converge/core';
```

### Resumability

```typescript
import {
  // Types
  type ResumePoint,
  
  // Functions
  ResumabilityManager,
  createResumabilityManager,
} from '@converge/core';
```

### Plugins

```typescript
import {
  // Types
  type ConvergePluginV2,
  type PluginAPIV2,
  type ToolFactory,
  type PluginEntry,
  type PluginStateV2,
  type PluginManifestV2,
  
  // Functions
  loadPluginsV2,
  formatPluginListV2,
  listBuiltinPluginsV2,
} from '@converge/core';
```

### TASK.md Parsing

```typescript
import {
  // Types
  type TaskMdDef,
  type TaskMdShape,
  type TaskMdExecutor,
  type TaskMdWbs,
  type TaskMdPlan,
  
  // Functions
  parseTaskMd,
  parseTaskMdString,
  mapTaskMdToTaskDefinition,
  parseChecks,
  parseAutoConverge,
  parseDiagnosisHints,
  parseContextSteps,
} from '@converge/core';
```

### WBS Executors

```typescript
import {
  createScriptWbsFn,
  createAiWbsFn,
} from '@converge/core';
```

### Meta-Optimization

```typescript
import {
  // Types
  type MetaAnalyzerConfig,
  type TaskJournalEntry,
  type MetaAnalysisStats,
  type ImprovementProposal,
  type MetaSidecarConfig,
  
  // Functions
  MetaAnalyzer,
  MetaOptimizationSidecar,
} from '@converge/core';
```

### Unit Architecture (V2)

```typescript
import {
  Unit,
  type V2UnitConfig,
  type V2CheckResult,
} from '@converge/core';
```

## Client SDK (`@converge/core/client`)

```typescript
import {
  ConvergeClient,
  createClient,
  type ConvergeClientContext,
  type SpawnedTask,
} from '@converge/core/client';
```

## Deprecated Exports

```typescript
// Use parseTaskMd instead
import { parseSkillMd } from '@converge/core';

// Use TaskMdDef instead
import type { SkillTaskDef } from '@converge/core';
```

## See Also

- [Programmatic API Guide](./PROGRAMMATIC_API.md)
- [CLI Documentation](./CLI.md)
- [TypeScript Examples](../../examples/)
