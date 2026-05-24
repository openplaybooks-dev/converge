/**
 * Task Definition Types - Universal Unit System
 *
 * The converge V2 architecture uses a single Unit class for all levels
 * (Project/Epic/Task/Subtask/Checklist). Behavior is data-driven through
 * TaskDefinition objects created via the taskDef().build() pattern.
 *
 * Each level is differentiated by its data, not its class:
 * - Project: Root level with project-wide config
 * - Epic: Groups related tasks
 * - Task: Leaf node or parent that can yield children
 * - Subtask: Nested task (can nest infinitely)
 * - Checklist: Fine-grained verification tasks
 */

/* ------------------------------------------------------------------ */
/*  Per-task AI configuration                                         */
/* ------------------------------------------------------------------ */

/**
 * AI configuration for a single task.
 *
 * When a task declares an `ai:` block in its TASK.md frontmatter, it
 * overrides the project-level AI defaults from project.yaml. Fields
 * map directly to AgentFnOptions so the task controls provider, model,
 * and provider-specific options declaratively.
 *
 * @example
 * ```yaml
 * ai:
 *   provider: codex
 *   model: gpt-5.4
 *   timeoutMs: 180000
 *   maxRetries: 2
 *   options:
 *     effort: high
 *     sandbox: workspace-write
 * ```
 */
export interface TaskAIConfig {
  /** Which provider to use (overrides project.yaml default) */
  provider?: string;

  /** Model to use */
  model?: string;

  /** Max time in ms before aborting */
  timeoutMs?: number;

  /** Maximum retries on failure */
  maxRetries?: number;

  /** Restrict available tools */
  allowedTools?: string[];

  /**
   * Provider-specific options passed through to the agent function.
   * e.g. { effort: "high", sandbox: "workspace-write" }
   */
  options?: Record<string, unknown>;
}

export interface TaskReviewConfig {
  /** Path to the artifact the human should inspect. */
  artifact: string;

  /** Artifact format. */
  format?: "md" | "html";

  /** Short prompt shown alongside the review artifact. */
  prompt?: string;

  /** Optional skill name to use when generating the artifact. */
  skill?: string;
}

/* ------------------------------------------------------------------ */
/*  Base Task Definition (used by all levels)                         */
/* ------------------------------------------------------------------ */

/**
 * Core task definition interface - used by ALL levels.
 * Created via taskDef().build() pattern.
 */
export interface TaskDefinition {
  /** Unique identifier for this unit (e.g., 'analyze-data', 'epic-01') */
  id: string;

  /** Human-readable title */
  title?: string;

  /** Optional description */
  description?: string;

  /**
   * Required input files/patterns (globs supported).
   * If any input is missing, creates a blocker gap.
   */
  inputs?: string[];

  /**
   * Expected output files/patterns (globs supported).
   *
   * Framework behavior:
   * - During task execution: Missing outputs create gaps that trigger fixes
   * - After task completion: Missing outputs cause task to be unmarked from "completed"
   * - Dependency blocking: Tasks depending on incomplete tasks are blocked
   *
   * This ensures tasks with missing outputs don't block the dependency chain
   * as "complete" - they're treated as incomplete and will be re-executed.
   *
   * Examples:
   * - outputs: ['.stitch/idea.md', '.stitch/UX.md']  // Both required
   * - outputs: ['src/design-tokens.ts', 'tailwind.config.ts']
   * - outputs: ['.stitch/designs/*.html']  // Glob patterns supported
   */
  outputs?: string[];

  /**
   * Prompt for AI execution. Can be a static string or a callback that
   * receives task context and returns the prompt dynamically.
   * Set via .prompt() on the builder.
   */
  prompt?: string | ((ctx: TaskContext) => string | Promise<string>);

  /**
   * AI agent to use for this task (shorthand for ai.provider).
   * Set via .agent() on the builder.
   */
  agent?: string;

  /**
   * Per-task AI configuration. Overrides project-level ai: defaults.
   * When both `agent` and `ai.provider` are set, `ai.provider` wins.
   */
  ai?: TaskAIConfig;

  /**
   * Skill(s) to use for this task.
   * Set via .skill() or .skills() on the builder.
   */
  skill?: string | string[];

  /**
   * Human review artifact configuration for gateway tasks.
   */
  review?: TaskReviewConfig;

  /**
   * Checks to validate task outputs. Three forms:
   * - `Check[]`              — static array (all checks known at definition time)
   * - `CheckEntry[]`         — mixed array; each entry may be static or a per-check callback
   * - `(ctx) => CheckEntry[]` — full array callback (original form, still supported)
   *
   * Set via .checks() or .check() on the builder.
   */
  checks?:
    | CheckEntry[]
    | ((ctx: TaskContext) => CheckEntry[] | Promise<CheckEntry[]>);

  /**
   * Dynamic variables (pure runtime data only).
   * Should NOT contain framework configuration like prompt, agent, skill, or checks.
   * Those belong as first-class properties above.
   */
  vars?: Record<string, unknown>;

  /**
   * Optional tags for filtering/organization.
   * Examples: ['milestone:html-design', 'priority:high', 'agent:frontend']
   */
  tags?: string[];

  /** When true, skip AI and execute shell commands from TASK.md body directly. Deprecated: use mode: leaf. */
  passthrough?: boolean;

  /** Converge prompt for do-while loops. Runs after main body. AI returns {action:"continue"|"done"}. */
  convergePrompt?: string;
  /** Converge command for do-while loops. Runs after main body and returns continue/done. */
  convergeCmd?: string;

  /**
   * Plan mode configuration. When present, the converge runs a planning phase
   * before execution: generates `plan.md` in the task journal, then injects
   * the plan into the execution prompt. The plan is generated once (idempotent).
   *
   * Set via .plan() on the builder.
   */
  planConfig?: PlanConfig;

  /**
   * AI-generated task configuration. When present, the converge uses AI to
   * generate the full task definition (SKILL.md or task.ts) from the prompt.
   * Output format is determined by `output` field ('skill' | 'task' | 'auto').
   *
   * Set via .fromAI(opts) on the builder.
   */
  fromAIConfig?: FromAIOpts;

  /**
   * Loop execution function. When present, the converge runs this function
   * repeatedly until it returns ctx.loop.done() or maxIterations is reached.
   * Each ctx.loop.spawn() call is journaled as a subtask.
   *
   * Set via .loop(fn) on the builder.
   */
  loopFn?: LoopFn;

  /**
   * Maximum loop iterations (used when loopFn is set). Defaults to 20.
   */
  maxLoopIterations?: number;

  /**
   * Executor function. When present, the converge runs this function once
   * (manual mode) or repeatedly (auto mode). The function controls its own
   * internal loop using ctx.ai.fn() and ctx.spawn().
   *
   * Set via .executor(fn) on the builder.
   */
  executorFn?: ExecutorFn;

  /**
   * Converge configuration. Controls how the executor is wrapped.
   * Set via .converge(opts?) on the builder.
   */
  convergeConfig?: ConvergeConfig;

  /**
   * Whether this task is a blocker (must complete successfully).
   * If true and task fails, tasks that depend on it will be blocked.
   *
   * Use for tasks whose failure makes downstream work meaningless:
   * - Data schema generation (everything depends on it)
   * - Core design system (all screens need it)
   * - Database setup (nothing works without it)
   *
   * Set to false for optional tasks that shouldn't block dependents:
   * - Documentation generation
   * - Optional asset generation
   * - Nice-to-have features
   *
   * Default: true (tasks block their dependents by default)
   */
  blocking?: boolean;

  /**
   * Explicit dependencies for programmatic task definitions (e.g. the planner).
   *
   * RFC 0034: `depends_on` is removed from TASK.md frontmatter (declarative tasks
   * are auto-chained alphabetically). This field remains for code-defined tasks
   * where alphabetical ordering isn't applicable.
   */
  depends_on?: string[];

  /**
   * RFC 0022 task mode — declared lifecycle contract.
   *
   * - `leaf`: produce outputs, no children
   * - `spawner`: one-shot fan-out via `spawn.plan.jsonl`
   * - `converger`: multi-wave loop until a halt condition
   * - `gateway`: synchronisation point; no body, no outputs
   *
   * Inferred from passthrough/seed/body signals when absent. The runtime
   * dispatcher in `run-executor.ts` branches on this field.
   */
  mode?: import("../task/mode/index.ts").TaskMode;

  /** RFC 0022 spawner config (only meaningful for `mode: spawner`). */
  spawn?: import("../task/mode/index.ts").SpawnerConfig;

  /** RFC 0022 converger config (only meaningful for `mode: converger`). */
  modeConverge?: import("../task/mode/index.ts").ConvergerConfig;

  /**
   * Facts API function. Collects project-level or task-specific facts before execution.
   * Called once per attempt before TASK/CHECK/NEEDS files are generated.
   *
   * Facts are collected hierarchically:
   * - Project level: collected once before any tasks run
   * - Epic level: merged with project facts
   * - Task level: merged with epic + project facts
   * - Nested tasks: inherit parent facts + collect their own
   *
   * Results are stored in:
   * - .converge/journal/tasks/{epic}/tasks/{task}/logs/facts.jsonl (append-only log)
   * - .converge/journal/tasks/{epic}/tasks/{task}/attempts/{N}/data/facts.json (snapshot)
   *
   * @example
   * ```ts
   * .factsApi(async (ctx) => {
   *   // Project-level facts (screens, prompts, design files)
   *   await ctx.collect('stitch-screens-count', 'ls .stitch/prompts/*.md | wc -l');
   *   await ctx.collect('design-system-exists', 'test -f .stitch/DESIGN.md');
   *
   *   // Task-specific facts (files from parent tasks)
   *   await ctx.collect('ux-ready', 'test -f .stitch/UX.md && grep -q "## Screens" .stitch/UX.md');
   * })
   * ```
   */
  factsApi?: FactsApiFn;

  /* ------------------------------------------------------------------ */
  /*  Execution Modifiers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Mark this task as async (non-blocking).
   * When true, the task starts immediately but doesn't block sibling tasks.
   * Dependents await implicitly via deps().
   *
   * Set via .async() on the builder.
   */
  isAsync?: boolean;

  /**
   * Background process configuration.
   * When set, the task's .execute() function runs as a long-lived process
   * that stays alive until the epic ends.
   *
   * Set via .background(config) on the builder.
   */
  backgroundConfig?: import("../process/types.ts").BackgroundConfig;

  /**
   * Schedule configuration.
   * When set, the task's .execute() function runs repeatedly on a timer.
   *
   * Set via .schedule(interval, opts?) on the builder.
   */
  scheduleConfig?: import("../schedule/types.ts").ScheduleConfig;

  /**
   * Sidecar hook map.
   * When set, the task subscribes to other tasks' lifecycle events.
   * The optional .execute() function runs once for init.
   *
   * Set via .sidecar(hooks) on the builder.
   */
  sidecarHooks?: import("../sidecar/types.ts").SidecarHooks;

  /**
   * Materialization strategy for this task.
   * - "incremental": task re-uses prior outputs when available; second run is a no-op.
   * - "queue": task processes items from a shared state file in batches until converged.
   */
  materialization?: string;

  /**
   * Configuration for queue-based incremental tasks.
   * Only used when materialization is "queue".
   */
  incrementConfig?: IncrementConfig;

  /** On-fail behavior: reset specified sibling tasks back to pending. */
  onFail?: OnFailConfig;

  /** RFC 0021: stub command and optional cleanup — run instead of AI executor in --stub mode. */
  stub?: { cmd: string; cleanup?: string };
}

export interface IncrementConfig {
  /** Path to shared state JSON file (relative to project root). */
  stateFile: string;
  /** Number of items to process per execution. Default: 5. */
  batchSize?: number;
  /** Shell command. Exit 0 = converged (queue drained). Exit non-zero = more work remains. */
  convergeCheck?: string;
  /** Safety limit on number of batches. Default: 100. */
  maxBatches?: number;
}

export interface OnFailConfig {
  /** Sibling task IDs to reset to pending when this task fails. */
  reset?: string[];
}

/**
 * Check definition for task validation.
 */
export interface Check {
  id: string;
  description?: string;
  cmd?: string;
  /** Discriminator. Defaults to "cmd" when absent. */
  type?: "cmd" | "ai" | "test";
  /** Plain-English assertion the AI judge verifies; required for type:"ai". */
  check?: string;
  /** Test name for type:"test" checks. */
  name?: string;
  /** Test arguments for type:"test" checks. */
  args?: Record<string, string>;
  /** Optional AI provider override. */
  agent?: string;
  /** Optional AI model override. */
  model?: string;
  /** Optional per-check timeout (ms). */
  timeoutMs?: number;
}

export interface TestCmdSpec {
  id: string;
  description?: string;
  cmd: string;
}

export interface TestRefSpec {
  name: string;
  description?: string;
  args?: Record<string, string>;
}

export type TestSpec = TestCmdSpec | TestRefSpec;

export interface CliSeedSpec {
  mode: "cli";
}

export type SeedSpec = CliSeedSpec;

export const tests = {
  cmd(spec: TestCmdSpec): TestCmdSpec {
    return {
      id: spec.id,
      description: spec.description ?? spec.id,
      cmd: spec.cmd,
    };
  },
  ref(spec: TestRefSpec): TestRefSpec {
    return {
      description: spec.description ?? `test:${spec.name}`,
      name: spec.name,
      args: spec.args,
    };
  },
};

export const seeds = {
  cli(): SeedSpec {
    return { mode: "cli" };
  },
};

/**
 * A single check entry — either a static Check object or a callback
 * that receives TaskContext and returns a Check.
 *
 * Enables per-check dynamic values without wrapping the whole array in a callback:
 * ```ts
 * .check(ctx => ({ id: 'html-exists', cmd: `test -f "${ctx.vars.htmlFile}"` }))
 * .check(ctx => ({ id: 'png-valid',   cmd: `file "${ctx.vars.pngFile}" | grep -q "PNG"` }))
 * ```
 */
export type CheckEntry = Check | ((ctx: TaskContext) => Check | Promise<Check>);

/**
 * Task context passed to callbacks (prompt, checks).
 * Minimal context for resolving dynamic values.
 */
export interface TaskContext {
  level: "task" | "epic" | "project";
  taskId: string;
  projectDir: string;
  vars: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Facts API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Context passed to factsApi function.
 * Provides methods to collect facts (bash command results).
 */
export interface FactsContext {
  /** Absolute project root directory */
  projectDir: string;
  /** Current task ID */
  taskId: string;
  /** Parent facts (inherited from epic/project) */
  parentFacts: Record<string, any>;
  /**
   * Collect a fact by running a bash command.
   * Result is stored in facts.jsonl and facts.json.
   *
   * @param id - Unique identifier for this fact
   * @param cmd - Bash command to execute
   * @param description - Optional human-readable description
   * @returns Promise resolving to the fact result
   */
  collect(
    id: string,
    cmd: string,
    description?: string,
  ): Promise<import("../task/facts/api.ts").Fact>;
}

/**
 * Declarative fact definition - a bash command or collect call.
 */
export type FactDef =
  | string // Simple command: 'test -f file.txt'
  | { cmd: string; description?: string }; // Command with description

/**
 * Facts object - maps fact IDs to commands.
 * @example
 * {
 *   'screens-count': 'ls .stitch/prompts/*.md | wc -l',
 *   'ux-ready': { cmd: 'test -f .stitch/UX.md', description: 'UX.md exists' }
 * }
 */
export type FactsObject = Record<string, FactDef>;

/**
 * Facts API function type - two forms:
 * 1. Imperative: async function with ctx.collect() calls
 * 2. Declarative: function returning object mapping IDs to commands
 */
export type FactsApiFn =
  | ((ctx: FactsContext) => Promise<void> | void) // Imperative
  | ((ctx: FactsContext) => FactsObject | Promise<FactsObject>); // Declarative

/* ------------------------------------------------------------------ */
/*  Level-Specific Interfaces (describe expected vars structure)     */
/* ------------------------------------------------------------------ */

/**
 * Project-level task definition.
 * The root unit that contains epics.
 *
 * Example:
 * ```ts
 * export default taskDef()
 *   .id('project-root')
 *   .title('Converge App')
 *   .inputs([])
 *   .outputs(['.converge/epics/**\/*.ts'])
 *   .vars({ projectRoot: process.cwd() })
 *   .build()
 * ```
 */
export interface ProjectDefinition extends TaskDefinition {
  vars?: {
    /** Project root directory */
    projectRoot?: string;
    /** Project-wide configuration */
    config?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Task-level definition (leaf node or parent with yields).
 *
 * Leaf task example (uses AI):
 * ```ts
 * export default taskDef()
 *   .id('analyze-data')
 *   .title('Analyze TSV Data')
 *   .agent('data-analyst')
 *   .prompt('Analyze TSV files and generate SQL schema')
 *   .inputs(['data/**\/*.tsv'])
 *   .outputs(['data-modeling/schema.sql'])
 *   .check({ id: 'validate-schema', cmd: 'test -f data-modeling/schema.sql' })
 *   .build()
 * ```
 *
 * Parent task example (yields children):
 * ```ts
 * export default taskDef()
 *   .id('generate-screens')
 *   .title('Generate All Screens')
 *   .yields({
 *     plan: 'Create one task per screen in sitemap',
 *     outputDir: '.converge/epics/02-ux/003-screens',
 *     template: '000-screen-{slug}.ts.tpl',
 *     maxTasks: 20,
 *   })
 *   .inputs(['.stitch/SITE.md'])
 *   .outputs(['.converge/epics/02-ux/003-screens/**\/*.ts'])
 *   .build()
 * ```
 */
export interface TaskLevelDefinition extends TaskDefinition {
  vars?: {
    /** AI agent to use (if leaf task) */
    agent?: string;
    /** Prompt for AI (if leaf task) */
    prompt?: string;
    /** Inline checks (run after outputs generated) */
    inlineChecks?: Array<{
      id: string;
      cmd?: string;
      description?: string;
    }>;
    /**
     * Yields config (if parent task that generates children).
     * When present, this task becomes a parent that:
     * 1. Uses AI to generate child task files from template
     * 2. Delegates to those children in next iteration
     */
    yields?: {
      /** Instructions for AI on how to generate children */
      plan: string;
      /** Directory where child tasks will be created */
      outputDir: string;
      /** Template file path (e.g., '000-subtask-{id}.ts.tpl') */
      template: string;
      /** Maximum number of child tasks to generate */
      maxTasks?: number;
      /** Target scope for child tasks (e.g., 'current-epic', 'project') */
      target?: string;
      /** Additional template variables */
      templateVars?: Record<string, unknown>;
    };
    [key: string]: unknown;
  };
}

/**
 * Subtask-level definition.
 * Same structure as TaskLevelDefinition - can nest infinitely.
 *
 * Example:
 * ```ts
 * export default taskDef()
 *   .id('screen-home')
 *   .title('Generate Home Screen')
 *   .agent('ui-designer')
 *   .prompt('Generate React component for home screen')
 *   .inputs(['.stitch/SITE.md', '.stitch/DESIGN_SYSTEM.md'])
 *   .outputs(['src/components/screens/Home.tsx'])
 *   .check({ id: 'lint', cmd: 'npm run lint src/components/screens/Home.tsx' })
 *   .build()
 * ```
 */
export interface SubtaskDefinition extends TaskLevelDefinition {
  // Subtasks are identical to tasks - same interface
  // Distinction is purely organizational (parent/child relationship)
}

/**
 * Checklist-level definition.
 * Fine-grained verification tasks, typically used for QA.
 *
 * Example:
 * ```ts
 * export default taskDef()
 *   .id('verify-responsive')
 *   .title('Verify Responsive Design')
 *   .inputs(['src/components/**\/*.tsx'])
 *   .outputs(['.converge/qa-reports/responsive-check.json'])
 *   .check({ id: 'viewport-test', cmd: 'npm run test:responsive' })
 *   .build()
 * ```
 */
export interface ChecklistDefinition extends TaskDefinition {
  vars?: {
    /** Check commands to run */
    checks?: Array<{
      id: string;
      cmd: string;
      description?: string;
    }>;
    /** Pass threshold (0-1, defaults to 1.0 = all checks must pass) */
    passThreshold?: number;
    [key: string]: unknown;
  };
}

/* ------------------------------------------------------------------ */
/*  Type Guards                                                       */
/* ------------------------------------------------------------------ */

/**
 * Check if a TaskDefinition is a Project-level definition.
 */
export function isProjectDefinition(
  def: TaskDefinition,
): def is ProjectDefinition {
  return (
    def.id.startsWith("project-") ||
    def.vars?.projectRoot !== undefined ||
    (!def.inputs?.length && !!def.outputs?.some((o) => o.includes("/epics/")))
  );
}

/**
 * Check if a TaskDefinition is a Task-level definition.
 */
export function isTaskDefinition(
  def: TaskDefinition,
): def is TaskLevelDefinition {
  return !!(def.vars?.agent || def.vars?.yields);
}

/**
 * Check if a TaskDefinition has yields (parent that generates children).
 */
export function hasYields(def: TaskDefinition): boolean {
  return !!def.vars?.yields;
}

/**
 * Check if a TaskDefinition is a leaf (uses AI, has no children).
 */
export function isLeafDefinition(def: TaskDefinition): boolean {
  return !!(def.vars?.agent && def.vars?.prompt) && !hasYields(def);
}

/**
 * Check if a TaskDefinition uses the loop execution primitive.
 */
function hasLoop(def: TaskDefinition): boolean {
  return !!def.loopFn;
}

/**
 * Check if a TaskDefinition uses the executor/converge execution primitive.
 */
function hasExecutor(def: TaskDefinition): boolean {
  return !!def.executorFn;
}

/**
 * Check if a TaskDefinition is a Checklist.
 */
export function isChecklistDefinition(
  def: TaskDefinition,
): def is ChecklistDefinition {
  return (
    def.id.startsWith("checklist-") ||
    !!(def.vars?.checks && Array.isArray(def.vars.checks))
  );
}

/* ------------------------------------------------------------------ */
/*  Loop Function API                                                 */
/* ------------------------------------------------------------------ */

/** Unique signal returned by ctx.loop.done() to exit the loop */
export const LOOP_DONE_SIGNAL: unique symbol = Symbol("loop:done");
export type LoopDoneSignal = typeof LOOP_DONE_SIGNAL;

/** Options for ctx.loop.spawn() */
export interface SpawnOptions {
  /** User-visible label for this spawn in the journal (default: skill filename) */
  label?: string;
  /** Override the user prompt sent to the skill (default: 'Execute.') */
  prompt?: string;
  /** Allowed tools for this spawn — defaults to unrestricted */
  allowedTools?: string[];
  /** Timeout in ms (default 600_000) */
  timeoutMs?: number;
  /** AbortSignal to cancel execution (default: none) */
  signal?: AbortSignal;
  /** AI provider override */
  provider?: "claude" | "acp" | "kimi" | "qwen" | "gemini" | "openfn" | "codex" | "deepcode";
  /** API key for the AI provider */
  apiKey?: string;
  /** Base URL for the AI API */
  baseUrl?: string;
  /** Model to use */
  model?: string;
}

/** Result returned by ctx.loop.spawn() */
export interface SpawnResult {
  success: boolean;
  durationMs: number;
  sessionId: string;
  error?: string;
}

/**
 * Handle returned by ctx.enqueue() — use the id to await the task later.
 */
export interface TaskHandle {
  /** Unique ID within this loop run */
  id: string;
}

/**
 * Context object passed to the loop handler function.
 *
 * @example
 * ```ts
 * .loop(async (ctx) => {
 *   // Direct spawn (executes immediately)
 *   await ctx.loop.spawn(taskDef().prompt('...').skills(['stitch-loop']));
 *   if (done) return ctx.loop.done();
 *
 *   // Queue-based spawn (register now, execute later)
 *   const task = ctx.enqueue(taskDef().prompt('...').skills(['stitch-loop']));
 *   await ctx.loop.await(task.id);
 *   return ctx.loop.next();
 * })
 * ```
 */
export interface LoopContext {
  loop: {
    /** True on the first iteration */
    isInitial: boolean;
    /** Current iteration number (1-based) */
    iteration: number;
    /**
     * Spawn a subtask immediately. Five forms:
     * - string                → SKILL.md path (backward compat, runs via claudefn)
     * - TaskDefinitionBuilder → declarative skill+prompt: taskDef().prompt().skills()
     * - () => TaskDef         → factory called at spawn time, runs as virtual child Unit
     * - taskDef().fromPath(p) → loads a .ts task file and runs it as a child Unit
     * - InlineTaskTarget      → inline definition, runs as virtual child Unit
     */
    spawn(target: LoopSpawnTarget, opts?: SpawnOptions): Promise<SpawnResult>;
    /**
     * Wait for a previously enqueued task to execute.
     * Executes the task now (deferred from ctx.enqueue) and resolves when done.
     */
    await(taskId: string): Promise<SpawnResult>;
    /** Signal that the loop is complete — return the result of this call */
    done(): LoopDoneSignal;
    /** Signal that the loop should continue to the next iteration */
    continue(): void;
    /** Alias for continue() */
    next(): void;
  };
  ai: {
    /**
     * Ask AI a yes/no question using read-only tools.
     * Returns true when the condition is satisfied.
     * Chain `.asJson(schema)` to get a structured response instead.
     */
    ask(question: string): AskResult;
  };
  /**
   * Register a task in the queue without executing it yet.
   * Returns a handle; call ctx.loop.await(handle.id) to execute and wait for it.
   */
  enqueue(target: LoopSpawnTarget, opts?: SpawnOptions): TaskHandle;
  /** Absolute project root directory */
  projectDir: string;
}

/**
 * The loop handler function type.
 * Return ctx.loop.done() to exit, return void/undefined to continue.
 */
export type LoopFn = (ctx: LoopContext) => Promise<LoopDoneSignal | void>;

/* ------------------------------------------------------------------ */
/*  Plan Mode API                                                     */
/* ------------------------------------------------------------------ */

/**
 * Configuration for plan mode.
 * When set, the converge runs a planning phase before execution:
 *   1. Calls AI with the planning prompt (read-only tools)
 *   2. Writes the resulting `plan.md` to the task journal
 *   3. Injects plan content into the execution prompt
 *
 * The plan is generated only once per task run (idempotent).
 *
 * @example
 * ```ts
 * // Use task's own prompt for planning (most common)
 * taskDef().id('...').prompt('Build the screen').plan()
 *
 * // Custom planning prompt
 * taskDef().id('...').prompt('Build the screen').plan('Outline steps to build this screen')
 *
 * // Dynamic planning prompt
 * taskDef().id('...').plan(ctx => `Plan generation of ${ctx.vars.screenTitle}`)
 * ```
 */
export interface PlanConfig {
  /**
   * Custom planning prompt. If omitted, the task's `.prompt()` value is used
   * with a planning-focused preamble prepended automatically.
   */
  prompt?: string | ((ctx: TaskContext) => string | Promise<string>);

  /**
   * Expected output file(s) from the planning phase.
   * Can be a single file path or glob pattern.
   * Example: 'prune-plan.spec' or '*.spec.md'
   */
  output?: string;

  /**
   * Instructions for how to format/structure the output.
   * This gets included in the planning prompt to guide output generation.
   * Can be a static string or a function receiving TaskContext.
   * Example: 'Format as markdown with --- request --- and --- spec --- sections'
   */
  outputPrompt?: string | ((ctx: TaskContext) => string | Promise<string>);
}

/* ------------------------------------------------------------------ */
/*  Seed (Work Breakdown Structure) API                               */
/* ------------------------------------------------------------------ */

/**
 * Valid spawn targets for SeedContext.spawn().
 * Pass a skill name string (e.g. 'stitch-generate') to spawn via SKILL.md.
 */
export type SeedSpawnTarget =
  | string // skill name — requires opts.id; writes a task that runs the skill
  | TaskDefinitionBuilder // taskDef().id('...').skill('...')
  | (() => TaskDefinition) // factory called at spawn time
  | TaskDefinition // pre-built definition
  | import("./task-md-definition.ts").TaskMdShape // plain TASK.md-shaped object
  | RawMarkdown // raw markdown string
  | TemplateRef // template file reference
  | ((ctx: SeedContext) => string); // callback returning markdown string

/* ── Tagged spawn helpers ──────────────────────────────────────────── */

/** Tagged wrapper for raw TASK.md markdown strings */
export interface RawMarkdown {
  readonly _type: "raw-markdown";
  readonly content: string;
}

/** Create a raw markdown spawn target */
export function rawMd(content: string): RawMarkdown {
  return { _type: "raw-markdown", content };
}

/** Tagged wrapper for template file references */
export interface TemplateRef {
  readonly _type: "template-ref";
  readonly path: string;
  readonly vars?: Record<string, unknown>;
}

/** Create a template file spawn target */
export function template(
  path: string,
  vars?: Record<string, unknown>,
): TemplateRef {
  return { _type: "template-ref", path, vars };
}

/**
 * Options for SeedContext.spawn().
 */
export interface SeedSpawnOptions {
  /** User-visible label for this spawn in the journal */
  label?: string;
  /** Timeout in ms (default 600_000) */
  timeoutMs?: number;
  // ── Fields required when target is a skill name string ──────────────
  /** Task ID (required when target is a skill name) */
  id?: string;
  /** Static prompt string passed to the skill */
  prompt?: string;
  /** Agent name */
  agent?: string;
  /** Input file paths / globs */
  inputs?: string[];
  /** Expected output file paths / globs */
  outputs?: string[];
  /** Task variables */
  vars?: Record<string, unknown>;
  /** Static checks (no callbacks — values are serialized to disk) */
  checks?: Check[];
}

/**
 * Context passed to a seed() function.
 *
 * @example
 * ```ts
 * .seed(async (ctx) => {
 *   await ctx.spawn(
 *     taskDef()
 *       .id('003-001-home')
 *       .title('Generate Home Screen')
 *       .skill('stitch-generate')
 *   );
 *   // auto-written to: {parentTaskDir}/tasks/003-001-home.ts
 * })
 * ```
 */
export interface SeedContext {
  /** Absolute project root directory */
  projectDir: string;
  /** Merged vars from parent task */
  vars: Record<string, unknown>;
  log: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  /** Read-only list of tasks spawned so far in this seed run */
  readonly spawnedTasks: ReadonlyArray<{ id: string; writeToPath?: string }>;
  /**
   * Absolute path to the spawn directory for this seed run.
   * Children are written here: {spawnDir}/{childId}/TASK.md
   * Use this to count previously-spawned children in incremental seeds.
   */
  readonly spawnDir: string;
  /**
   * Explicit Seed continuation control. Prefer this over returning booleans.
   *
   * @example
   * ctx.loop.continue(); // request another incremental seed cycle
   * ctx.loop.stop();     // finish this seed parent
   */
  loop: {
    continue(): SeedContinuationResult;
    continueAfterChildren(): SeedContinuationResult;
    stop(): SeedContinuationResult;
    readonly requested: "continue" | "stop" | undefined;
  };
  /** Alias for ctx.loop.continueAfterChildren(). */
  continueAfterChildren(): SeedContinuationResult;
  /** Alias for ctx.loop.stop() with an optional reason for readability. */
  stop(reason?: string): SeedContinuationResult;
  /**
   * @deprecated Use ctx.loop.continue() instead. Retained for compatibility.
   */
  _keepLooping?: boolean;
  /**
   * AI utilities for read-only analysis during Seed breakdown.
   * Uses read-only tools (Read, Glob) — cannot create or modify files.
   *
   * Useful for parsing plan.md output or analyzing project files
   * to determine which subtasks to spawn.
   *
   * @example
   * ```ts
   * const plan = await ctx.ai.askJson(
   *   'Read plan.md and list assets',
   *   schema,
   * );
   * for (const asset of plan.assets) {
   *   await ctx.spawn(taskDef().id(asset.id).prompt(asset.prompt).build());
   * }
   * ```
   */
  ai: {
    /** Yes/no question — resolves to a boolean. */
    ask(question: string): AskResult;
    /**
     * Ask the AI a question and get a typed JSON response validated
     * against a Zod schema. Cleaner shorthand for `ask(q).asJson(schema)`.
     */
    askJson<T>(question: string, schema: import("zod").ZodType<T>): Promise<T>;
  };
  /**
   * Plan utilities for accessing task artifacts
   */
  plan: {
    /**
     * Get absolute path to a plan file from another task
     * @param relativePath - Relative path like '../001-analyze-data-models/plan.md'
     * @returns Absolute path to the plan file in the journal
     */
    getPlanPath(relativePath: string): string;
  };
  /**
   * Spawn a child task. The framework writes the child's TASK.md into the
   * journal, mirroring the playbook's nesting at
   * `.converge/journal/<playbook>/tasks/<parent>/tasks/<child>/TASK.md`.
   * The write path is not caller-controlled — the playbook source dir is
   * the immutable blueprint, the journal holds all execution state.
   */
  spawn(target: SeedSpawnTarget, opts?: SeedSpawnOptions): Promise<void>;
  /**
   * Goal evaluation API.
   * Available when the playbook declares `goals:` in playbook.yml.
   * Lets seeds read goal state and re-evaluate checks to decide
   * whether to continue looping.
   */
  goals: {
    /** Re-run all goal checks and return the updated state. */
    evaluate(): Promise<import("../task/goal/evaluate-goals.ts").GoalState>;
    /** Spawn or merge an adaptive goal into the journal goal ledger. */
    spawn(
      goal: import("../task/goal/evaluate-goals.ts").GoalSpawnInput,
    ): Promise<import("../task/playbook/types.ts").PlaybookGoal>;
    /** Append an adaptive goal update, usually to add checks or status. */
    update(
      goal: import("../task/goal/evaluate-goals.ts").GoalSpawnInput,
    ): Promise<import("../task/playbook/types.ts").PlaybookGoal>;
    /** Spawn or merge many adaptive goals into the journal goal ledger. */
    spawnMany(
      goals: import("../task/goal/evaluate-goals.ts").GoalSpawnInput[],
    ): Promise<import("../task/playbook/types.ts").PlaybookGoal[]>;
    /** All declared + adaptive goals after ledger merge. */
    list(): Promise<import("../task/playbook/types.ts").PlaybookGoal[]>;
    /** Goals that have not yet been satisfied. */
    getRemaining(): Promise<import("../task/playbook/types.ts").PlaybookGoal[]>;
    /** Unsatisfied goals whose dependencies are satisfied. */
    getBuildable(): Promise<import("../task/playbook/types.ts").PlaybookGoal[]>;
    /** First buildable goal, or null when no active goal can run. */
    nextBuildable(): Promise<import("../task/playbook/types.ts").PlaybookGoal | null>;
    /** Unsatisfied goals blocked by unmet dependencies. */
    getBlocked(): Promise<Array<{
      goal: import("../task/playbook/types.ts").PlaybookGoal;
      unmetDependencies: string[];
    }>>;
    /** Goals whose checks now pass. */
    getSatisfied(): Promise<import("../task/playbook/types.ts").PlaybookGoal[]>;
    /** True when every declared goal is satisfied. */
    allSatisfied(): Promise<boolean>;
    /** The last persisted goal state, or null if never evaluated. */
    getState(): import("../task/goal/evaluate-goals.ts").GoalState | null;
    /**
     * Runtime inventory ledger API.
     * Portable state for goal-driven playbooks:
     *   .converge/inventory/<playbook>/goals.jsonl
     *   .converge/inventory/<playbook>/tasks.jsonl
     */
    ledger: {
      /** Ensure runtime ledger exists; bootstraps from playbook.yml goals when missing. */
      ensure(): Promise<void>;
      /** Replay ledger and return current goal/task state. */
      state(): Promise<import("../task/goal/runtime-ledger.ts").RuntimeLedgerState>;
      /** Append/merge a goal definition in goals.jsonl. */
      upsertGoal(
        goal: import("../task/playbook/types.ts").PlaybookGoal,
      ): Promise<void>;
      /** Append goal runtime status update in goals.jsonl. */
      setGoalStatus(
        goalId: string,
        status: import("../task/goal/runtime-ledger.ts").GoalRuntimeStatus,
        metadata?: Record<string, unknown>,
      ): Promise<void>;
      /** Append/merge task backlog item in tasks.jsonl. */
      upsertTask(task: {
        taskPath?: string;
        id: string;
        goalId: string;
        summary: string;
        status?: import("../task/goal/runtime-ledger.ts").TaskRuntimeStatus;
        source?: "static" | "spawned" | "backlog";
        parentTaskPath?: string;
        playbook?: string;
        epoch?: string;
        metadata?: Record<string, unknown>;
      }): Promise<void>;
      /** Append task status update in tasks.jsonl. */
      setTaskStatus(
        taskId: string,
        status: import("../task/goal/runtime-ledger.ts").TaskRuntimeStatus,
        metadata?: Record<string, unknown>,
      ): Promise<void>;
      /** First buildable goal from current runtime state, or null. */
      nextBuildable(): Promise<import("../task/goal/runtime-ledger.ts").RuntimeGoal | null>;
    };
  };
}

/**
 * The Seed handler function type.
 * Call ctx.spawn() for each child task.
 * Return `true` to signal more iterations are needed (incremental seeding).
 * Return `void` or `false` when done.
 */
export type SeedContinuationResult = { type: "seed-continuation"; action: "continue" | "stop" };

export type SeedFn =
  (ctx: SeedContext) =>
    | Promise<SeedContinuationResult | boolean | void>
    | SeedContinuationResult
    | boolean
    | void;

/* ------------------------------------------------------------------ */
/*  fromAI() config                                                   */
/* ------------------------------------------------------------------ */

/**
 * Configuration for taskDef().fromAI() — AI-generated task body.
 * The converge will invoke Claude to produce a SKILL.md or task.ts
 * based on the prompt and output preference.
 *
 * NOTE: Builder API is stable; executor implementation is deferred.
 */
export interface FromAIOpts {
  /** Natural language description — AI generates the full task from this */
  prompt: string;
  /**
   * Output format:
   * - 'skill'  → generate a SKILL.md (simpler, prompt-driven)
   * - 'task'   → generate a task.ts (complex, full builder API)
   * - 'auto'   → AI decides based on complexity (default)
   */
  output?: "skill" | "task" | "auto";
  /** Complexity hint passed to the generator */
  complexity?: "simple" | "complex";
}

/* ------------------------------------------------------------------ */
/*  Executor/Converge API                                              */
/* ------------------------------------------------------------------ */

/**
 * Spawn target for ctx.spawn().
 * - string            → SKILL.md path relative to project root (backward compat)
 * - InlineTaskTarget  → inline TaskDefinition, creates a virtual child Unit
 */
export type SpawnTarget = string | InlineTaskTarget;

/**
 * Inline task target — creates a child Unit from a TaskDefinition in memory.
 * Optionally writes a .ts file to disk so the child participates in future
 * convergence iterations.
 */
export interface InlineTaskTarget {
  definition: TaskDefinition;
  /**
   * Optional path (relative to project root) to persist this definition as a .ts file.
   * When omitted the child is virtual (in-memory only, not discoverable by file scan).
   * Example: '.converge/epics/02-ux/003-screens/gen-homepage.ts'
   */
  writeToPath?: string;
}

/**
 * Marker returned by taskDef().fromPath(path).
 * Synchronous — no file I/O at definition time.
 * Spawn resolves and runs the .ts task file at call time.
 */
export interface PathRefTarget {
  readonly _type: "path-ref";
  /** Path to a .ts task file, relative to project root */
  readonly path: string;
}

/** Factory called at spawn time, not definition time */
export type TaskDefFactory = () => TaskDefinition;

/* ------------------------------------------------------------------ */
/*  Needs — pre-flight checks before a task runs                      */
/* ------------------------------------------------------------------ */

export interface McpServerNeed {
  type: "mcp-server";
  /** Name prefix to look for in Claude Code MCP config (e.g. 'stitch') */
  name: string;
}

export type Need = McpServerNeed;

/**
 * Declare that a task needs a named MCP server to be configured.
 * The converge checks `.claude/settings.json` before running and fails
 * fast with a clear error instead of hanging until timeout.
 *
 * @example
 * taskDef().prompt('...').skills(['stitch-loop']).need(mcpServer('stitch'))
 */
export function mcpServer(name: string): McpServerNeed {
  return { type: "mcp-server", name };
}

/**
 * All forms accepted by ctx.loop.spawn().
 * - string                  → SKILL.md path (backward compat, runs via claudefn)
 * - TaskDefinitionBuilder   → declarative skill+prompt spawn: taskDef().prompt().skills()
 * - TaskDefFactory          → factory called at spawn time, runs as virtual child Unit
 * - PathRefTarget           → loads a .ts task file and runs it as a child Unit
 * - InlineTaskTarget        → inline definition, runs as virtual child Unit
 */
export type LoopSpawnTarget =
  | string
  | TaskDefinitionBuilder
  | TaskDefFactory
  | PathRefTarget
  | InlineTaskTarget;

export function isBuilderTarget(
  t: LoopSpawnTarget,
): t is TaskDefinitionBuilder {
  // Structural check instead of instanceof to handle dual-module instances
  // (task.ts loads @openplaybooks/converge-core via package resolution; internals load directly from src).
  // Check for the internal `def` data property — always present regardless of instance.
  return (
    typeof t === "object" &&
    t !== null &&
    "def" in t &&
    typeof (t as any).build === "function"
  );
}
export function isPathRefTarget(t: LoopSpawnTarget): t is PathRefTarget {
  return typeof t === "object" && t !== null && (t as any)._type === "path-ref";
}
export function isTaskDefFactory(t: LoopSpawnTarget): t is TaskDefFactory {
  return typeof t === "function";
}
export function isInlineTaskTarget(t: LoopSpawnTarget): t is InlineTaskTarget {
  return typeof t === "object" && t !== null && "definition" in t;
}

/**
 * Thenable returned by ctx.ai.ask().
 *
 * - `await ctx.ai.ask(q)`                → boolean  (yes/no convenience)
 * - `await ctx.ai.ask(q).asJson(schema)` → T        (structured response)
 *
 * Backward-compatible: existing `await ctx.ai.ask(q)` still returns boolean.
 */
export interface AskResult extends PromiseLike<boolean> {
  /**
   * Instead of resolving to a boolean, ask the AI to return structured JSON
   * matching the provided Zod schema.
   *
   * @example
   * ```ts
   * const info = await ctx.ai.ask(
   *   'How many screens are remaining in SITE.md?'
   * ).asJson(z.object({ remaining: z.number(), names: z.array(z.string()) }));
   * console.log(info.remaining, info.names);
   * ```
   */
  asJson<T>(schema: import("zod").ZodType<T>): Promise<T>;
}

/**
 * Options for ctx.ai.fn() — creates a callable AI function.
 */
export interface AiFnOpts<T> {
  /** Prompt sent to AI on each invocation. */
  prompt: string;
  /** Zod schema structuring the AI's JSON response. */
  schema: import("zod").ZodType<T>;
  /** Tools available to the AI (default: undefined — all tools allowed) */
  allowedTools?: string[];
  /** Timeout per invocation in ms (default: 60_000) */
  timeoutMs?: number;
  /** Human-readable label — appears in journal events */
  label?: string;
}

/**
 * A callable AI function returned by ctx.ai.fn().
 * Each call invokes claudefn independently and is journaled.
 */
export type AiFn<T> = () => Promise<T>;

/**
 * Context passed to an executor function.
 *
 * @example
 * ```ts
 * .executor(async (ctx) => {
 *   const checkDone = ctx.ai.fn({
 *     prompt: 'Are all screens in SITE.md marked [x]?',
 *     schema: z.object({ done: z.boolean(), remaining: z.number() }),
 *   });
 *   while (!(await checkDone()).done) {
 *     await ctx.spawn('.converge/skills/stitch-loop/SKILL.md', { label: 'stitch-loop' });
 *   }
 * })
 * ```
 */
export interface ExecutorContext {
  /** Metadata about the running task. */
  task: {
    id: string;
    title?: string;
    /** Converge iteration (1-based). Always 1 in manual mode. */
    iteration: number;
  };
  ai: {
    /**
     * Create a callable AI function with a structured schema.
     * The returned AiFn can be called many times (e.g. in a while loop).
     * Each call is independently journaled.
     */
    fn<T>(opts: AiFnOpts<T>): AiFn<T>;
    /**
     * Convenience: ask a yes/no question.
     * Sugar for ctx.ai.fn({ ..., schema: z.object({ answer: z.boolean() }) })().
     * Chain `.asJson(schema)` to get a structured response instead.
     */
    ask(question: string): AskResult;
  };
  /**
   * Spawn a subtask. Accepts a SKILL.md path or an inline TaskDefinition.
   * Always journaled as a subtask checklist item.
   */
  spawn(target: SpawnTarget, opts?: SpawnOptions): Promise<SpawnResult>;
  /** Absolute path to the project root. */
  projectDir: string;
}

/**
 * The executor function type.
 * Receives ExecutorContext; user writes their own control flow (while, for, etc.).
 * Returns void — the converge decides when to stop.
 */
export type ExecutorFn = (ctx: ExecutorContext) => Promise<void>;

/* ------------------------------------------------------------------ */
/*  Converge fn API                                                    */
/* ------------------------------------------------------------------ */

/** Result returned by a single executor run inside the converge */
export interface ConvergeRunResult {
  success: boolean;
  durationMs: number;
  spawnCount: number;
  error?: string;
}

/**
 * Context passed to a custom or AI-generated converge function.
 * The converge fn controls when and how often the executor runs.
 */
export interface ConvergeContext {
  projectDir: string;
  task: { id: string; title?: string; iteration: number };
  /** Run the executor function once */
  run(): Promise<ConvergeRunResult>;
  /** True when all declared output globs resolve to at least one file */
  checkOutputs(): Promise<boolean>;
  /** Run a named .check() validator — true on pass */
  runCheck(id: string): Promise<boolean>;
}

/** Return value of a converge function */
export interface ConvergeDecision {
  converged: boolean;
  rationale?: string;
}

/**
 * A converge function controls convergence.
 * Call ctx.run() one or more times, then decide if the task is done.
 *
 * @example
 * .converge(async (ctx) => {
 *   const result = await ctx.run();
 *   const ok = result.success && await ctx.checkOutputs();
 *   return { converged: ok, rationale: ok ? 'outputs present' : 'outputs missing' };
 * })
 */
export type ConvergeFn = (ctx: ConvergeContext) => Promise<ConvergeDecision>;

/**
 * Configuration for .converge() on the builder.
 *
 * Three unified modes — all reduce to a single ConvergeFn at runtime:
 * - 'default' : built-in policy — runs executor once, checks outputs + .check() validators
 * - 'custom'  : user-provided ConvergeFn (set via .converge(fn) shorthand)
 * - 'ai'      : AI generates __converge__.ts in the task folder; loaded and run like custom
 */
export interface ConvergeConfig {
  mode?: "default" | "custom" | "ai";
  /** Custom converge function — set automatically when passing fn to .converge(fn) */
  fn?: ConvergeFn;
  /** Outer loop cap (default 20) — converge fn is called up to this many times */
  maxIterations?: number;
  /** Per-run timeout in ms */
  timeoutMs?: number;
  /** AI mode: injected into the generation prompt to guide what the converge checks */
  convergenceCriteria?: string;
  /** Wall-clock timeout across ALL iterations (default: 20 min). Task is killed if exceeded. */
  maxTaskDurationMs?: number;
}

/* ------------------------------------------------------------------ */
/*  Builder Pattern                                                   */
/* ------------------------------------------------------------------ */

/**
 * Task definition builder - provides fluent API for creating TaskDefinitions.
 *
 * Usage:
 * ```ts
 * export default taskDef()
 *   .id('my-task')
 *   .title('My Task')
 *   .inputs(['src/**\/*.ts'])
 *   .outputs(['dist/bundle.js'])
 *   .agent('developer')
 *   .prompt('Build the TypeScript project')
 *   .check({ id: 'test', cmd: 'npm test' })
 *   .build()
 * ```
 */
export class TaskDefinitionBuilder {
  private def: Partial<TaskDefinition> = {
    vars: {},
  };

  id(id: string): this {
    this.def.id = id;
    return this;
  }

  title(title: string): this {
    this.def.title = title;
    return this;
  }

  description(description: string): this {
    this.def.description = description;
    return this;
  }

  inputs(inputs: string[]): this {
    this.def.inputs = inputs;
    return this;
  }

  outputs(outputs: string[]): this {
    this.def.outputs = outputs;
    return this;
  }

  tags(tags: string[]): this {
    this.def.tags = tags;
    return this;
  }

  milestone(milestone: string): this {
    const tags = this.def.tags || [];
    this.def.tags = [...tags, `milestone:${milestone}`];
    return this;
  }

  deps(deps: string[]): this {
    this.def.vars = { ...this.def.vars, deps };
    return this;
  }

  agent(agent: string): this {
    this.def.agent = agent;
    return this;
  }

  skill(skill: string | string[]): this {
    this.def.skill = skill;
    return this;
  }

  skills(skills: string[]): this {
    this.def.skill = skills;
    return this;
  }

  /**
   * Declare that a task needs a single prerequisite.
   * @example taskDef().prompt('...').need(mcpServer('stitch'))
   */
  need(need: Need): this {
    const existing = (this.def.vars?.needs as Need[] | undefined) ?? [];
    this.def.vars = { ...this.def.vars, needs: [...existing, need] };
    return this;
  }

  /**
   * Declare that a task needs multiple prerequisites.
   * @example taskDef().prompt('...').needs(mcpServer('stitch'), mcpServer('sheets'))
   */
  needs(...needs: Need[]): this {
    const existing = (this.def.vars?.needs as Need[] | undefined) ?? [];
    this.def.vars = { ...this.def.vars, needs: [...existing, ...needs] };
    return this;
  }

  /**
   * Set the skill resolution strategy for this task.
   * - 'auto': Merge task + agent skills, resolve all transitive dependencies (default)
   * - 'manual': Only explicit task skills, no transitive resolution
   * - 'inherit': Only agent skills + transitive dependencies
   */
  skillResolution(strategy: "auto" | "manual" | "inherit"): this {
    this.def.vars = { ...this.def.vars, skillResolution: strategy };
    return this;
  }

  prompt(
    prompt: string | ((ctx: TaskContext) => string | Promise<string>),
  ): this {
    this.def.prompt = prompt;
    return this;
  }

  /**
   * Add a single check. Two forms:
   * - Static: `.check({ id: 'lint', cmd: 'npm run lint' })`
   * - Dynamic: `.check(ctx => ({ id: 'html-exists', cmd: `test -f "${ctx.vars.htmlFile}"` }))`
   */
  check(entry: CheckEntry): this {
    const existing = Array.isArray(this.def.checks) ? this.def.checks : [];
    this.def.checks = [...existing, entry];
    return this;
  }

  /**
   * Set all checks at once. Three forms:
   * - Static array:    `.checks([{ id: 'lint', cmd: 'npm run lint' }])`
   * - Mixed array:     `.checks([{ id: 'a' }, ctx => ({ id: 'b', cmd: `...${ctx.vars.x}` })])`
   * - Full callback:   `.checks(ctx => [{ id: 'a', cmd: `...${ctx.vars.x}` }])`
   */
  checks(
    checks:
      | CheckEntry[]
      | ((ctx: TaskContext) => CheckEntry[] | Promise<CheckEntry[]>),
  ): this {
    this.def.checks = checks;
    return this;
  }

  /**
   * Canonical declarative validation API. Accepts only primitive object entries
   * built with `tests.cmd({ ... })` or `tests.ref({ ... })`.
   */
  tests(tests: TestSpec[]): this {
    this.def.checks = tests.map((test) => {
      if ("cmd" in test) {
        return {
          id: test.id,
          description: test.description ?? test.id,
          type: "cmd",
          cmd: test.cmd,
        };
      }
      return {
        id: `test:${test.name}`,
        description: test.description ?? `test:${test.name}`,
        type: "test",
        name: test.name,
        args: test.args,
      };
    });
    return this;
  }

  yields(yields: {
    plan: string;
    outputDir: string;
    template: string;
    maxTasks?: number;
    templateVars?: Record<string, unknown>;
  }): this {
    this.def.vars = { ...this.def.vars, yields };
    return this;
  }

  /**
   * Enable plan mode for this task.
   * Before executing, the converge generates `plan.md` in the task journal
   * using the planning prompt, then injects the plan into the execution prompt.
   *
   * Forms:
   * - `.plan()`                → use task's .prompt() with planning preamble
   * - `.plan('custom prompt')` → custom static planning prompt
   * - `.plan(ctx => '...')`    → dynamic planning prompt (receives TaskContext)
   * - `.plan({ prompt, output, outputPrompt })` → full config with output specification
   *
   * @example
   * ```ts
   * taskDef()
   *   .id('003-generate-home')
   *   .prompt('Generate the home screen HTML and PNG')
   *   .plan()  // plan before generating
   *   .skill('stitch-generate')
   *
   * // With output specification
   * taskDef()
   *   .plan({
   *     prompt: 'Create extraction spec',
   *     output: 'prune-plan.spec',
   *     outputPrompt: 'Format with @prune markers'
   *   })
   * ```
   */
  plan(
    promptOrConfig?:
      | string
      | PlanConfig
      | ((ctx: TaskContext) => string | Promise<string>),
  ): this {
    if (
      typeof promptOrConfig === "string" ||
      typeof promptOrConfig === "function"
    ) {
      this.def.planConfig = { prompt: promptOrConfig };
    } else if (promptOrConfig && typeof promptOrConfig === "object") {
      this.def.planConfig = promptOrConfig;
    } else {
      this.def.planConfig = {};
    }
    return this;
  }

  /**
   * Configure AI-generated task body.
   * The converge will invoke Claude to produce a SKILL.md or task.ts.
   *
   * NOTE: executor implementation is deferred — builder API is stable now.
   *
   * @example
   * ```ts
   * taskDef()
   *   .id('003-001-home')
   *   .fromAI({ prompt: 'Generate the home screen using stitch-generate', output: 'skill' })
   * ```
   */
  fromAI(opts: FromAIOpts): this {
    this.def.fromAIConfig = opts;
    return this;
  }

  /**
   * Set a programmatic loop handler. The function is called once per iteration.
   * Return ctx.loop.done() to exit; return void/undefined to continue.
   *
   * @example
   * ```ts
   * .loop(async (ctx) => {
   *   if (ctx.loop.isInitial) { ... }
   *   await ctx.loop.spawn('.converge/skills/stitch-loop/SKILL.md');
   *   const done = await ctx.ai.ask('All screens marked [x]?');
   *   if (done) return ctx.loop.done();
   * })
   * ```
   */
  loop(fn: LoopFn): this {
    this.def.loopFn = fn;
    return this;
  }

  /** Cap on loop iterations when using .loop() (defaults to 20) */
  maxLoopIterations(max: number): this {
    this.def.maxLoopIterations = max;
    return this;
  }

  /**
   * Set a programmatic executor function.
   * The function receives an ExecutorContext and controls its own loop internally.
   * Pair with .converge(opts?) to configure how it is wrapped.
   *
   * @example
   * ```ts
   * .executor(async (ctx) => {
   *   const checkDone = ctx.ai.fn({
   *     prompt: 'Are all screens in SITE.md marked [x]?',
   *     schema: z.object({ done: z.boolean(), remaining: z.number() }),
   *   });
   *   while (!(await checkDone()).done) {
   *     await ctx.spawn('.converge/skills/stitch-loop/SKILL.md');
   *   }
   * })
   * ```
   */
  executor(fn: ExecutorFn): this {
    this.def.executorFn = fn;
    return this;
  }

  /**
   * Unified execution entry point. Alias for .executor(fn).
   *
   * Sets the function that runs when this task executes. The modifier methods
   * (.async(), .background(), .schedule(), .sidecar()) control HOW this
   * function is invoked — the execute function itself is always the same
   * signature.
   *
   * @example
   * ```ts
   * export default taskDef()
   *   .id('install-deps')
   *   .title('Install Dependencies')
   *   .execute(async (ctx) => {
   *     await ctx.ai.fn({ prompt: 'Run npm install and fix any issues' });
   *   })
   *   .build()
   * ```
   *
   * @example
   * ```ts
   * // With a modifier — same .execute(), different execution strategy
   * export default taskDef()
   *   .id('generate-assets')
   *   .title('Generate Assets')
   *   .async()
   *   .execute(async (ctx) => {
   *     await ctx.ai.fn({ prompt: 'Generate all SVG icons...' });
   *   })
   *   .build()
   * ```
   */
  execute(fn: ExecutorFn): this {
    this.def.executorFn = fn;
    return this;
  }

  /**
   * Configure the converge wrapper for this executor. Three forms:
   *
   * - .converge()       → default mode: checks outputs + .check() validators
   * - .converge(fn)     → custom mode: your ConvergeFn controls convergence
   * - .converge({...})  → explicit config: set mode, maxIterations, etc.
   *   - { mode: 'default' } — same as .converge()
   *   - { mode: 'custom', fn } — same as .converge(fn)
   *   - { mode: 'ai' }      — AI generates __converge__.ts, runs it like custom
   */
  converge(arg?: ConvergeFn | ConvergeConfig): this {
    if (!arg) {
      this.def.convergeConfig = { mode: "default" };
    } else if (typeof arg === "function") {
      this.def.convergeConfig = { mode: "custom", fn: arg };
    } else {
      this.def.convergeConfig = { mode: "default", ...arg };
    }
    return this;
  }

  vars(vars: Record<string, unknown>): this {
    this.def.vars = { ...this.def.vars, ...vars };
    return this;
  }

  /** Mark this task as a blocker (must complete successfully) */
  blocking(value: boolean = true): this {
    this.def.blocking = value;
    return this;
  }

  /**
   * Declare dependencies on other tasks.
   *
   * RFC 0034: only meaningful for programmatic task definitions (e.g. the planner).
   * TASK.md frontmatter `depends_on` is ignored — alphabetical auto-chaining applies.
   */
  depends_on(deps: string[]): this {
    this.def.depends_on = deps;
    return this;
  }

  /**
   * Set the facts collection function (imperative API).
   * Called before task execution to gather environment facts.
   *
   * @example
   * ```ts
   * .factsApi(async (ctx) => {
   *   await ctx.collect('screens-count', 'ls .stitch/prompts/*.md | wc -l');
   *   await ctx.collect('ux-ready', 'test -f .stitch/UX.md');
   * })
   * ```
   */
  factsApi(fn: FactsApiFn): this {
    this.def.factsApi = fn;
    return this;
  }

  /**
   * Set facts collection using declarative object syntax (recommended).
   * Simpler than factsApi - just return an object mapping IDs to commands.
   *
   * Two forms supported:
   * 1. Simple string commands
   * 2. Objects with cmd + optional description
   *
   * @example
   * ```ts
   * // Simple form
   * .facts(() => ({
   *   'screens-count': 'ls .stitch/prompts/*.md | wc -l',
   *   'ux-ready': 'test -f .stitch/UX.md'
   * }))
   *
   * // With descriptions
   * .facts(() => ({
   *   'screens-count': {
   *     cmd: 'ls .stitch/prompts/*.md | wc -l',
   *     description: 'Count screen prompt files'
   *   },
   *   'ux-ready': {
   *     cmd: 'test -f .stitch/UX.md',
   *     description: 'Check if UX.md exists'
   *   }
   * }))
   *
   * // Access parent facts
   * .facts((ctx) => ({
   *   'parent-complete': `test -n "${ctx.parentFacts['task-complete']}"`,
   *   'design-ready': 'test -f .stitch/DESIGN.md'
   * }))
   * ```
   */
  facts(fn: (ctx: FactsContext) => FactsObject | Promise<FactsObject>): this {
    // Wrap the declarative function in an imperative factsApi
    this.def.factsApi = async (ctx: FactsContext) => {
      const factsObj = await fn(ctx);
      for (const [id, def] of Object.entries(factsObj)) {
        if (typeof def === "string") {
          await ctx.collect(id, def);
        } else {
          await ctx.collect(id, def.cmd, def.description);
        }
      }
    };
    return this;
  }

  /* ------------------------------------------------------------------ */
  /*  Execution Modifiers                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Mark this task as async (non-blocking).
   * The .execute() function runs immediately but doesn't block sibling tasks.
   * Downstream tasks that deps() on this task await its completion implicitly.
   *
   * Incompatible with .background() (build-time error).
   *
   * @example
   * taskDef()
   *   .id('generate-assets')
   *   .async()
   *   .execute(async (ctx) => { ... })
   *   .build()
   */
  async(): this {
    if (this.def.backgroundConfig) {
      throw new Error(
        ".async() and .background() are mutually exclusive — async completes, background stays alive",
      );
    }
    this.def.isAsync = true;
    return this;
  }

  /**
   * Make this task a long-running background process.
   * The .execute() function runs and stays alive until the epic ends.
   * Downstream tasks that deps() on this wait for readyWhen, not completion.
   *
   * Incompatible with .async() (build-time error).
   *
   * @example
   * taskDef()
   *   .id('dev-server')
   *   .background({ readyWhen: /✓ Ready in/, healthCheck: 'http://localhost:3000' })
   *   .execute(async (ctx) => { await ctx.shell('npx next dev'); })
   *   .build()
   */
  background(config: import("../process/types.ts").BackgroundConfig): this {
    if (this.def.isAsync) {
      throw new Error(
        ".async() and .background() are mutually exclusive — async completes, background stays alive",
      );
    }
    this.def.backgroundConfig = config;
    return this;
  }

  /**
   * Re-run .execute() on a timer interval.
   *
   * @param interval - Duration string: '5s', '15s', '1m', '5m', etc.
   * @param opts     - Optional: { runImmediately, skipIfBusy }
   *
   * @example
   * taskDef()
   *   .id('health-monitor')
   *   .schedule('5s')
   *   .execute(async (ctx) => { ... })
   *   .build()
   */
  schedule(
    interval: string,
    opts?: import("../schedule/types.ts").ScheduleOpts,
  ): this {
    this.def.scheduleConfig = {
      intervalMs: parseDurationString(interval),
      intervalStr: interval,
      runImmediately: opts?.runImmediately ?? true,
      skipIfBusy: opts?.skipIfBusy ?? true,
    };
    return this;
  }

  /**
   * Hook into other tasks' lifecycle events.
   * The hook callbacks fire when matching events occur during the epic.
   * An optional .execute() function runs once at sidecar start for init logic.
   *
   * @example
   * taskDef()
   *   .id('git-checkpoint')
   *   .sidecar({
   *     'task:complete': async (event, ctx) => {
   *       await ctx.shell('git add -A && git commit -m "checkpoint"');
   *     },
   *   })
   *   .build()
   */
  sidecar(hooks: import("../sidecar/types.ts").SidecarHooks): this {
    this.def.sidecarHooks = hooks;
    return this;
  }

  build(): TaskDefinition {
    if (!this.def.id) {
      throw new Error("TaskDefinition requires an id");
    }
    return this.def as TaskDefinition;
  }

  /** Return the partial definition without id validation — for transient spawns (no .id() needed). */
  partial(): Partial<TaskDefinition> {
    return { ...this.def };
  }

  /**
   * Return a PathRefTarget marker for use with ctx.loop.spawn().
   * Synchronous — no file I/O here; the task file is loaded at spawn time.
   *
   * @example
   * await ctx.loop.spawn(taskDef().fromPath('.converge/epics/02-ux/003/task.ts'))
   */
  fromPath(path: string): PathRefTarget {
    return { _type: "path-ref", path };
  }
}

/* ------------------------------------------------------------------ */
/*  Duration Parser (inline to avoid circular imports)                */
/* ------------------------------------------------------------------ */

const DURATION_RE = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)$/;
const DURATION_MULTIPLIERS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
};

/** Parse a duration string like '5s', '1m', '500ms' into milliseconds. */
function parseDurationString(input: string): number {
  const match = input.trim().match(DURATION_RE);
  if (!match) {
    throw new Error(
      `Invalid duration: '${input}'. Expected: <number><unit> (ms, s, m, h). Examples: '5s', '1m'.`,
    );
  }
  return Math.round(parseFloat(match[1]) * DURATION_MULTIPLIERS[match[2]]);
}

/**
 * Factory function for creating task definitions.
 *
 * @example
 * export default taskDef()
 *   .id('my-task')
 *   .title('My Task')
 *   .build()
 */
export function taskDef(): TaskDefinitionBuilder {
  return new TaskDefinitionBuilder();
}
