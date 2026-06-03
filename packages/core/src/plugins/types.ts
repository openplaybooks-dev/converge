/**
 * Plugin System V2 - Enhanced for Gap-Driven Architecture
 *
 * Extends the existing plugin system to support:
 * - CheckFn, EvalFn, PlanFn, TaskFn registration
 * - Gap detection and handling
 * - Function-driven execution
 */

import type {
  CheckFnMeta,
  EvalFnMeta,
  PlanFnMeta,
  TaskFnMeta,
} from "../task/checks/types.ts";
import type { HookEvent } from "../hooks/types.ts";
import type {
  InterceptorFn,
  InterceptEvent,
} from "../hooks/interceptor-registry.ts";

/* ------------------------------------------------------------------ */
/*  Provider Registry                                                 */
/* ------------------------------------------------------------------ */

/**
 * A no-op stub for the ProviderRegistry interface.
 * The real registry lives in packages/agentfn/src/provider-registry.ts.
 * We declare the interface here so packages/core/src/plugins/types.ts doesn't
 * need a cross-package import (tsup can't resolve ../../agentfn paths during bundling).
 *
 * Actual implementation: loadPluginsV2() in loader.ts passes the agentfn
 * registry instance to each plugin's registerProviders(registry) hook.
 */
export interface ProviderRegistry {
  register(
    name: string,
    factory: (opts: Record<string, unknown>) => Promise<unknown>,
  ): void;
  get(
    name: string,
  ): ((opts: Record<string, unknown>) => Promise<unknown>) | undefined;
}

/**
 * Provider name — currently just strings but typed for future safety.
 * In practice, these are: "claude" | "kimi" | "qwen" | "gemini" | "acp" |
 * "openfn" | "codex" | "deepcode" | "stub"
 */
export type Provider = string;

/* ------------------------------------------------------------------ */
/*  Per-System Extension Types                                        */
/* ------------------------------------------------------------------ */

export interface CheckEvalContext {
  taskId: string;
  projectDir: string;
  attemptDir: string;
  vars: Record<string, unknown>;
}

export interface CheckRunResult {
  passed: boolean;
  output?: string;
  error?: string;
}

export type CheckTypeEvaluator = (
  check: Record<string, unknown>,
  ctx: CheckEvalContext,
) => Promise<CheckRunResult>;

export interface SkillSource {
  name: string;
  resolve(query: {
    taskId: string;
    playbook: string;
    tags?: string[];
  }): Promise<
    Array<{
      name: string;
      description?: string;
      path: string;
      whenToUse?: string;
    }>
  >;
}

export interface JournalConsumer {
  name: string;
  onEvent(event: Record<string, unknown>): void | Promise<void>;
  onFlush?(): void | Promise<void>;
  onClose?(): void | Promise<void>;
}

export interface PluginCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler(args: {
    positional: string[];
    options: Record<string, unknown>;
  }): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Plugin Capabilities                                               */
/* ------------------------------------------------------------------ */

export type PluginCapability =
  | "providers"
  | "hooks"
  | "interceptors"
  | "check-types"
  | "skills"
  | "journal-consumers"
  | "commands";

/* ------------------------------------------------------------------ */
/*  Enhanced Plugin Definition                                        */
/* ------------------------------------------------------------------ */

/**
 * Enhanced converge plugin for gap-driven architecture
 */
export interface ConvergePluginV2 {
  /** Unique plugin name (e.g., "typescript", "nextjs") */
  name: string;

  /** Semver version */
  version: string;

  /** Human-readable description */
  description?: string;

  /** Plugins this one requires to be loaded first */
  requires?: string[];

  /** Declared capabilities — enables runtime enforcement warnings */
  capabilities?: PluginCapability[];

  /**
   * Called during plugin initialization.
   * Receives the enhanced plugin API for registering functions.
   */
  setup(api: PluginAPIV2): void | Promise<void>;

  /**
   * Called after setup. Allows plugins to register provider factories
   * with the agentfn registry.
   */
  registerProviders?(registry: ProviderRegistry): void;
}

/* ------------------------------------------------------------------ */
/*  Enhanced Plugin API                                               */
/* ------------------------------------------------------------------ */

/**
 * Enhanced plugin API with function-driven capabilities
 */
export interface PluginAPIV2 {
  /** Options passed from project.yaml plugin configuration */
  readonly options: Record<string, unknown>;

  /** Project root path */
  readonly projectDir: string;

  /* ──────────────── Function Registration ──────────────── */

  /** Register a check function */
  registerCheck(check: CheckFnMeta): void;

  /** Register multiple check functions */
  registerChecks(checks: CheckFnMeta[]): void;

  /** Register an evaluation function */
  registerEval(evalFn: EvalFnMeta): void;

  /** Register multiple evaluation functions */
  registerEvals(evals: EvalFnMeta[]): void;

  /** Register a plan function */
  registerPlan(plan: PlanFnMeta): void;

  /** Register multiple plan functions */
  registerPlans(plans: PlanFnMeta[]): void;

  /** Register a task function */
  registerTask(task: TaskFnMeta): void;

  /** Register multiple task functions */
  registerTasks(tasks: TaskFnMeta[]): void;

  /* ──────────────── Legacy Support ──────────────── */

  /** Legacy: Register a named check (old API) */
  addCheck(name: string, plugin: unknown): void;

  /** Legacy: Register multiple named checks (old API) */
  addChecks(checks: Record<string, unknown>): void;

  /** Legacy: Register a task type (old API) */
  addTaskType(type: unknown): void;

  /** Legacy: Extend a task type (old API) */
  extendTaskType(name: string, extension: unknown): void;

  /* ──────────────── Hooks & Tools ──────────────── */

  /** Register a project-level lifecycle hook */
  addHook(event: HookEvent, fn: HookFn): void;

  /** Set default plan variables */
  addVars(vars: Record<string, unknown>): void;

  /** Register a custom tool available in TaskContext.tools */
  addTool(name: string, factory: ToolFactory): void;

  /* ──────────────── Interceptors ──────────────── */

  /** Register an interceptor (middleware) for a framework operation */
  addInterceptor(
    event: InterceptEvent,
    fn: InterceptorFn<unknown>,
    priority?: number,
  ): void;

  /* ──────────────── Per-System Registries ──────────────── */

  /** Register a custom check type evaluator (e.g., "http", "schema") */
  registerCheckType(type: string, evaluator: CheckTypeEvaluator): void;

  /** Register a custom skill source for dynamic skill resolution */
  registerSkillSource(source: SkillSource): void;

  /** Register a journal event consumer for telemetry export */
  registerJournalConsumer(consumer: JournalConsumer): void;

  /** Register a custom CLI command */
  registerCommand(cmd: PluginCommand): void;

  /* ──────────────── Provider Registration ──────────────── */

  /**
   * Register a provider factory for agentfn.
   * The factory may be async (for lazy loading of provider modules).
   * @deprecated Use the `registerProviders(registry)` hook on the plugin instead.
   */
  registerProvider(
    name: string,
    factory: (opts: Record<string, unknown>) => Promise<unknown>,
  ): void;

  /* ──────────────── Queries ──────────────── */

  /** Read a var set by a previously loaded plugin */
  getVar(key: string): unknown;

  /** Check if another plugin is loaded */
  hasPlugin(name: string): boolean;

  /** Get check function by name */
  getCheck(name: string): CheckFnMeta | undefined;

  /** Get evaluation function by name */
  getEval(name: string): EvalFnMeta | undefined;

  /** Get plan function by name */
  getPlan(name: string): PlanFnMeta | undefined;

  /** Get task function by type */
  getTask(type: string): TaskFnMeta | undefined;
}

/* ------------------------------------------------------------------ */
/*  Hook Types                                                         */
/* ------------------------------------------------------------------ */

/**
 * Full typed hook event union — re-exported from the hooks module.
 * The new colon-namespaced events ('task:complete', 'epic:start', etc.)
 * are the canonical API. Legacy event names are kept as aliases below
 * for backward compatibility with existing plugins.
 */
export type {
  HookEvent,
  HookFn as TypedHookFn,
  LegacyHookFn,
} from "../hooks/types.ts";

export type {
  InterceptorFn,
  InterceptEvent,
} from "../hooks/interceptor-registry.ts";

/**
 * Legacy hook function signature used by `PluginAPIV2.addHook()`.
 * @deprecated Use typed `HookFn<E>` from `hooks/types.ts` for new code.
 */
export type HookFn = (ctx: unknown, ...args: unknown[]) => void | Promise<void>;

export type ToolFactory = (ctx: unknown) => unknown;

/* ------------------------------------------------------------------ */
/*  Enhanced Plugin State                                             */
/* ------------------------------------------------------------------ */

/**
 * Accumulated state from all loaded plugins (V2)
 */
export interface PluginStateV2 {
  /** Registered check functions */
  checks: Map<string, CheckFnMeta>;

  /** Registered evaluation functions */
  evals: Map<string, EvalFnMeta>;

  /** Registered plan functions */
  plans: Map<string, PlanFnMeta>;

  /** Registered task functions */
  tasks: Map<string, TaskFnMeta>;

  /** Merged plan variables from all plugins */
  vars: Record<string, unknown>;

  /** Accumulated hooks by event name */
  hooks: Map<HookEvent, HookFn[]>;

  /** Registered tool factories */
  tools: Map<string, ToolFactory>;

  /** Registered provider factories (from registerProviders hook) */
  providers: Map<string, (opts: Record<string, unknown>) => Promise<unknown>>;

  /** Registered interceptors by event */
  interceptors: Map<
    InterceptEvent,
    Array<{ fn: InterceptorFn<unknown>; priority: number }>
  >;

  /** Custom check type evaluators */
  checkTypes: Map<string, CheckTypeEvaluator>;

  /** Plugin-provided skill sources */
  skillSources: SkillSource[];

  /** Journal event consumers */
  journalConsumers: JournalConsumer[];

  /** Plugin-registered CLI commands */
  commands: Map<string, PluginCommand>;

  /** Names of loaded plugins in order */
  loaded: string[];

  /** Plugin metadata for CLI display */
  manifests: PluginManifestV2[];
}

/**
 * Enhanced plugin manifest
 */
export interface PluginManifestV2 {
  name: string;
  version: string;
  description?: string;
  requires?: string[];

  // Function contributions
  checkFns: string[];
  evalFns: string[];
  planFns: string[];
  taskFns: string[];

  // Legacy contributions
  checks: string[];
  taskTypes: string[];
  extendedTypes: string[];

  // Infrastructure
  hooks: HookEvent[];
  vars: string[];
  tools: string[];

  // Providers
  providers: string[];

  // New extension contributions
  interceptors: InterceptEvent[];
  checkTypes: string[];
  skillSources: string[];
  journalConsumers: string[];
  commands: string[];
}

/* ------------------------------------------------------------------ */
/*  Plugin Entry (unchanged from V1)                                  */
/* ------------------------------------------------------------------ */

export type PluginEntry =
  | string
  | [string, Record<string, unknown>]
  | { name: string; options?: Record<string, unknown> };

/* ------------------------------------------------------------------ */
/*  Legacy Compatibility                                              */
/* ------------------------------------------------------------------ */

/**
 * Legacy alias for ConvergePluginV2
 * @deprecated Use ConvergePluginV2 instead
 */
export type ConvergePlugin = ConvergePluginV2;

/**
 * Legacy alias for PluginAPIV2
 * @deprecated Use PluginAPIV2 instead
 */
export type PluginAPI = PluginAPIV2;
