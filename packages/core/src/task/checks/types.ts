/**
 * Function-Driven Execution Types
 *
 * Defines the core function interfaces for gap-driven execution:
 * - CheckFn: Validates invariants
 * - EvalFn: Detects gaps
 * - PlanFn: Generates tasks from gaps
 * - TaskFn: Executes work to close gaps
 */

import type { Gap, CheckResult, EvalResult } from "../gap/types.ts";
import type { TaskConfig } from "../../storage/types.ts";
import type { ProjectContext, TaskContext } from "../../context/types.ts";

/* ------------------------------------------------------------------ */
/*  Check Function                                                    */
/* ------------------------------------------------------------------ */

/**
 * A check function validates an invariant and returns gaps if violated.
 *
 * Examples:
 * - TypeScript compilation check
 * - Test suite check
 * - Linting check
 * - Build verification
 */
export type CheckFn = (
  ctx: TaskContext | ProjectContext,
) => Promise<CheckResult> | CheckResult;

/**
 * Check function metadata
 */
export interface CheckFnMeta {
  /** Check name/identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Check implementation */
  fn: CheckFn;

  /** Check type category */
  category?: "build" | "test" | "lint" | "security" | "custom";

  /** Timeout (ms) */
  timeout?: number;

  /** Whether check can run in parallel with others */
  parallel?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Evaluation Function                                               */
/* ------------------------------------------------------------------ */

/**
 * An evaluation function detects gaps by running checks and comparing
 * current state to target invariants.
 *
 * Examples:
 * - Epic-level: Check if all required files exist
 * - Task-level: Check if task outputs match expectations
 */
export type EvalFn = (
  ctx: ProjectContext | TaskContext,
) => Promise<EvalResult> | EvalResult;

/**
 * Evaluation function metadata
 */
export interface EvalFnMeta {
  /** Evaluation name/identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Evaluation implementation */
  fn: EvalFn;

  /** Checks to run */
  checks: string[];

  /** Invariants to verify */
  invariants?: string[];
}

/* ------------------------------------------------------------------ */
/*  Plan Function                                                     */
/* ------------------------------------------------------------------ */

/**
 * A plan function generates tasks from detected gaps.
 * This is just-in-time planning based on current state.
 *
 * Examples:
 * - Generate setup tasks for missing infrastructure
 * - Generate implementation tasks for missing features
 * - Generate fix tasks for failing tests
 */
export type PlanFn = (
  ctx: ProjectContext,
  gaps: Gap[],
) => Promise<TaskConfig[]> | TaskConfig[];

/**
 * Plan function metadata
 */
export interface PlanFnMeta {
  /** Plan name/identifier */
  name: string;

  /** Human-readable description */
  description: string;

  /** Planning implementation */
  fn: PlanFn;

  /** Gap types this planner can handle */
  gapTypes?: string[];

  /** Priority (higher executes first) */
  priority?: number;
}

/* ------------------------------------------------------------------ */
/*  Task Function                                                     */
/* ------------------------------------------------------------------ */

/**
 * A task function executes work to close gaps.
 * The core unit of execution in the gap-driven model.
 *
 * Examples:
 * - Run npm install
 * - Generate code via LLM
 * - Run tests
 * - Deploy to production
 */
export type TaskFn = (ctx: TaskContext) => Promise<TaskResult> | TaskResult;

/**
 * Task execution result
 */
export interface TaskResult {
  /** Whether task succeeded */
  success: boolean;

  /** Output message */
  message?: string;

  /** Gaps resolved by this task */
  gapsResolved?: string[];

  /** Gaps discovered during execution */
  gapsDiscovered?: Gap[];

  /** Files modified */
  filesModified?: string[];

  /** Error details (if failed) */
  error?: {
    message: string;
    stack?: string;
    recoverable?: boolean;
  };

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Task function metadata
 */
export interface TaskFnMeta {
  /** Task type identifier */
  type: string;

  /** Human-readable description */
  description: string;

  /** Task implementation */
  fn: TaskFn;

  /** Expected inputs */
  inputs?: string[];

  /** Expected outputs */
  outputs?: string[];

  /** Default checks to run after execution */
  checks?: string[];

  /** Maximum attempts before giving up */
  maxAttempts?: number;

  /** Timeout (ms) */
  timeout?: number;

  /** Whether task can be run in parallel with others */
  parallel?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Function Registry                                                 */
/* ------------------------------------------------------------------ */

/**
 * Registry for all function types
 */
export interface FunctionRegistry {
  checks: Map<string, CheckFnMeta>;
  evals: Map<string, EvalFnMeta>;
  plans: Map<string, PlanFnMeta>;
  tasks: Map<string, TaskFnMeta>;
}

/**
 * Function registration helpers
 */
export interface FunctionRegistration {
  /** Register a check function */
  registerCheck(meta: CheckFnMeta): void;

  /** Register an evaluation function */
  registerEval(meta: EvalFnMeta): void;

  /** Register a plan function */
  registerPlan(meta: PlanFnMeta): void;

  /** Register a task function */
  registerTask(meta: TaskFnMeta): void;

  /** Get check function */
  getCheck(name: string): CheckFnMeta | undefined;

  /** Get evaluation function */
  getEval(name: string): EvalFnMeta | undefined;

  /** Get plan function */
  getPlan(name: string): PlanFnMeta | undefined;

  /** Get task function */
  getTask(type: string): TaskFnMeta | undefined;

  /** List all registered functions */
  list(): {
    checks: string[];
    evals: string[];
    plans: string[];
    tasks: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Function Builder Helpers                                          */
/* ------------------------------------------------------------------ */

/**
 * Builder for creating check functions
 */
export interface CheckBuilder {
  /** Set check name */
  name(name: string): this;

  /** Set description */
  description(description: string): this;

  /** Set category */
  category(category: CheckFnMeta["category"]): this;

  /** Set timeout */
  timeout(ms: number): this;

  /** Enable parallel execution */
  parallel(enabled?: boolean): this;

  /** Set check implementation */
  run(fn: CheckFn): CheckFnMeta;
}

/**
 * Builder for creating evaluation functions
 */
export interface EvalBuilder {
  /** Set eval name */
  name(name: string): this;

  /** Set description */
  description(description: string): this;

  /** Set checks to run */
  checks(checks: string[]): this;

  /** Set invariants to verify */
  invariants(invariants: string[]): this;

  /** Set eval implementation */
  run(fn: EvalFn): EvalFnMeta;
}

/**
 * Builder for creating plan functions
 */
export interface PlanBuilder {
  /** Set plan name */
  name(name: string): this;

  /** Set description */
  description(description: string): this;

  /** Set gap types this planner handles */
  handles(gapTypes: string[]): this;

  /** Set priority */
  priority(priority: number): this;

  /** Set plan implementation */
  run(fn: PlanFn): PlanFnMeta;
}

/**
 * Builder for creating task functions
 */
export interface TaskBuilder {
  /** Set task type */
  type(type: string): this;

  /** Set description */
  description(description: string): this;

  /** Set expected inputs */
  inputs(inputs: string[]): this;

  /** Set expected outputs */
  outputs(outputs: string[]): this;

  /** Set default checks */
  checks(checks: string[]): this;

  /** Set max attempts */
  maxAttempts(attempts: number): this;

  /** Set timeout */
  timeout(ms: number): this;

  /** Enable parallel execution */
  parallel(enabled?: boolean): this;

  /** Set task implementation */
  run(fn: TaskFn): TaskFnMeta;

  /** Unified execution entry point. Alias for .run(fn). */
  execute(fn: TaskFn): TaskFnMeta;
}

/* ------------------------------------------------------------------ */
/*  Enhanced Yields API (Phase 1)                                     */
/* ------------------------------------------------------------------ */

/**
 * Declarative yields configuration
 */
export interface YieldsDeclarative {
  /** Natural language plan describing what to yield (e.g., "Create one task per screen") */
  plan: string;

  /**
   * Directory (relative to project root) where generated task files are written.
   * e.g. ".converge/epics/02-epic/003-generate-all-screens"
   * When set, the executor simply creates files here — no complex routing needed.
   */
  outputDir?: string;

  /**
   * Path (relative to project root) of the task template file to instantiate.
   * e.g. ".converge/epics/02-epic/003-generate-all-screens/000-screen-{slug}.ts.tpl"
   * The executor reads this file and replaces placeholders for each yielded item.
   */
  template?: string;

  /** Conditional execution predicate */
  when?: (result: TaskResult) => boolean | Promise<boolean>;

  /** Maximum tasks to spawn */
  maxTasks?: number;

  /** Where to spawn tasks */
  target?: "current-epic" | "next-epic" | "new-epic";

  /** Default task type for spawned tasks */
  taskType?: string;

  /** Default checks for spawned tasks */
  checks?: string[];

  /** Approval mode */
  approval?: "immediate" | "review";
}

/**
 * Programmatic yields function
 */
export type YieldsFn = (
  ctx: TaskContext,
  result: TaskResult,
) => Promise<TaskConfig[]> | TaskConfig[];

/**
 * Static template yields
 */
export interface YieldsStatic {
  tasks: Array<Partial<TaskConfig>>;
}

/**
 * Union type for yields configuration
 */
export type YieldsConfig = string | YieldsDeclarative | YieldsFn | YieldsStatic;

/* ------------------------------------------------------------------ */
/*  AutoConverge API (Phase 2)                                         */
/* ------------------------------------------------------------------ */

/**
 * AutoConverge configuration for task validation
 */
export interface AutoConvergeConfig {
  /** Derive validation from task context */
  from?: "task-prompt" | "inputs" | "outputs" | "description";

  /** Custom validation prompt */
  prompt?: string;

  /** Enable refinement loop */
  refinable?: boolean;

  /** Maximum refinement iterations */
  maxRefinements?: number;

  /** Cache verification across similar tasks */
  cache?: boolean;

  /** Cache key for reuse */
  cacheKey?: string;

  /** Validation strictness (0-1) */
  strictness?: number;

  /** Sandbox level */
  sandbox?: "strict" | "moderate" | "permissive";
}

/**
 * Verification issue
 */
export interface ConvergeIssue {
  message: string;
  severity: "error" | "warning";
  file?: string;
  line?: number;
}

/**
 * Verification execution result
 */
export interface ConvergeResult {
  /** Whether validation passed */
  passed: boolean;

  /** Issues detected */
  issues: ConvergeIssue[];

  /** Verification execution time (ms) */
  duration: number;

  /** Whether verification was refined */
  refined?: boolean;

  /** Number of refinement iterations */
  refinementCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Task Definition Builder (for reusable task configs)              */
/* ------------------------------------------------------------------ */

/**
 * Builder for creating reusable task definitions (TaskConfig)
 * Supports both v2-style (builder pattern) and v1-style (fluent API) methods.
 */
export interface TaskDefBuilder {
  /** Set task ID */
  id(id: string): this;

  /** Set task title */
  title(title: string): this;

  /** Set task description */
  description(description: string): this;

  /** Set task type */
  type(type: string): this;

  /** Set dependencies */
  deps(deps: string[]): this;

  /** Set expected inputs */
  inputs(inputs: string[]): this;

  /** Set expected outputs */
  outputs(outputs: string[]): this;

  /** Set checks to run */
  checks(checks: string[]): this;

  /** Set task function reference */
  fn(fn: string): this;

  /** Set task variables */
  vars(vars: Record<string, unknown>): this;

  /** Set constraints */
  constraints(constraints: {
    sequential?: boolean;
    parallel?: boolean;
    maxAttempts?: number;
    timeout?: number;
    condition?: string;
  }): this;

  /** Set metadata */
  metadata(metadata: Record<string, unknown>): this;

  /* ------------------------------------------------------------------ */
  /*  V1-Style Fluent API Methods                                       */
  /* ------------------------------------------------------------------ */

  /** Set prompt (v1-style) - stored in vars */
  prompt(prompt: string): this;

  /** Set skill (v1-style) - stored in vars */
  skill(skill: string): this;

  /** Set agent (v1-style) - stored in vars */
  agent(agent: string): this;

  /** Configure loop behavior (v1-style) - stored in vars */
  loop(config: {
    maxIterations: number;
    continueWhile?: string; // Serialized function or condition
  }): this;

  /** Configure dynamic task generation (v1-style) - stored in vars */
  yields(config: YieldsConfig): this;

  /** Configure subtasks (sequential child task execution) - stored in vars */
  subtasks(config: import("../subtasks/types.ts").SubtasksConfig): this;

  /** Configure AutoConverge validation (Phase 2) */
  autoConverge(config: AutoConvergeConfig): this;

  /** Set execution function (v1-style) - maps to fn field */
  run(fn: TaskFn): this;

  /**
   * Unified execution entry point. Alias for .run(fn).
   *
   * Sets the function that runs when this task executes. Modifiers like
   * .async(), .background(), .schedule(), .sidecar() control HOW this
   * function is invoked.
   */
  execute(fn: TaskFn): this;

  /**
   * Tag this task as belonging to a specific milestone.
   *
   * When `runtime.milestone` is set in converge.ts, only tasks whose milestone
   * tag matches (or tasks with no tag) will execute. Tasks tagged with a
   * different milestone are skipped.
   *
   * @param id - Milestone identifier, e.g. `'html-design'`
   */
  milestone(id: string): this;

  /** Build the task config */
  build(): TaskConfig;
}

/* ------------------------------------------------------------------ */
/*  Internal Epic Definition (for runtime compatibility)               */
/* ------------------------------------------------------------------ */

/**
 * @internal For runtime compatibility only. Do not use in new code.
 * @deprecated This type is being phased out. Use PlaybookDefinition instead.
 */
export interface EpicDefinition {
  id: string;
  name: string;
  description?: string;
  goals: import("../goal/types.ts").Goal[];
  deps: string[];
  checks: CheckFnMeta[];
  evals: EvalFnMeta[];
  planners: PlanFnMeta[];
  tasks: TaskConfig[];
}

/* ------------------------------------------------------------------ */
/*  Project Definition Builder                                        */
/* ------------------------------------------------------------------ */

/**
 * Project definition (built from ProjectBuilder)
 */
export interface ProjectDefinition {
  config: ProjectConfig;

  /** Initialize runtime */
  init(): Promise<import("../../runtime/types.ts").Runtime>;

  /** Run the project convergence loop */
  run(
    config?: Partial<
      import("../../orchestrator/convergence.ts").ConvergenceConfig
    >,
  ): Promise<
    import("../../orchestrator/project-orchestrator.ts").ProjectOrchestrationResult
  >;

  /** Resume from checkpoint */
  resume(): Promise<
    import("../../orchestrator/project-orchestrator.ts").ProjectOrchestrationResult
  >;

  /** Verify project state */
  verify(): Promise<import("../gap/types.ts").EvalResult>;
}

/**
 * Builder for creating project definitions
 */
export interface ProjectBuilder {
  /** Set project name */
  name(name: string): this;

  /** Set project directory */
  dir(dir: string): this;

  /** Set project description */
  description(description: string): this;

  /** Set project variables */
  variables(vars: Record<string, unknown>): this;

  /** Set plugins to load */
  plugins(plugins: string[]): this;

  /** Build the project definition */
  build(): ProjectDefinition;
}

// Import ProjectConfig from storage types
import type { ProjectConfig } from "../../storage/types.ts";
