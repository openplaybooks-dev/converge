/**
 * Converge Configuration Types
 *
 * The `ConvergeConfig` type is the shape of `.converge/PROJECT.md` frontmatter.
 * Configuration is defined as YAML frontmatter in a markdown file.
 *
 * @example
 * // .converge/PROJECT.md
 * ---
 * name: My App
 * discovery:
 *   watch: false
 * ---
 */

import type { PluginEntry } from "../plugins/types.ts";
import type { ConvergeHooks } from "../hooks/types.ts";

/* ------------------------------------------------------------------ */
/*  Discovery Config                                                   */
/* ------------------------------------------------------------------ */

/**
 * Controls where Converge looks for task/epic/check/plan files.
 * All values are glob patterns resolved relative to the project dir.
 *
 * @example
 * discovery: {
 *   tasks: ['.converge/tasks/**\/*.ts'],
 *   epics: ['.converge/epics/**\/*.ts'],
 *   watch: true,
 * }
 */
export interface DiscoveryConfig {
  /**
   * Glob patterns for task files.
   * Defaults: ['.converge/tasks/**\/*.ts', '.converge/tasks/**\/*.task.ts']
   */
  tasks?: string[];

  /**
   * Glob patterns for epic files.
   * Defaults: ['.converge/epics/**\/*.ts', '.converge/epics/**\/*.epic.ts']
   */
  epics?: string[];

  /**
   * Glob patterns for check function files.
   * Defaults: ['.converge/checks/**\/*.ts', '.converge/checks/**\/*.check.ts']
   */
  checks?: string[];

  /**
   * Glob patterns for plan function files.
   * Defaults: ['.converge/plans/**\/*.ts']
   */
  plans?: string[];

  /**
   * Glob patterns for agent definition files (.md).
   */
  agents?: string[];

  /**
   * Glob patterns for skill definition files (.md).
   */
  skills?: string[];

  /**
   * Glob patterns for test definition files (.test.md).
   * Defaults: ['.converge/playbooks/*​/tests/*.test.md', '.converge/journal/*​/tests/*.test.md']
   */
  tests?: string[];

  /**
   * Enable watch mode — re-scan and adapt when files change.
   * Requires `chokidar` to be installed: `npm i -D chokidar`
   * Default: false
   */
  watch?: boolean;

  /**
   * Spawn constraint for task files created by agents during execution.
   *
   * - `'subtasks-only'`: New task files must reside inside a subdirectory whose
   *   name matches an existing top-level task file basename. Files placed directly
   *   in `.converge/tasks/` are blocked with a warning.
   * - `'unrestricted'`: No restriction on where agents may create task files.
   *
   * Default: `'subtasks-only'`
   */
  spawn?: "subtasks-only" | "unrestricted";
}

/* ------------------------------------------------------------------ */
/*  Runtime Config                                                     */
/* ------------------------------------------------------------------ */

/**
 * Runtime tuning parameters forwarded to `ConvergenceConfig`.
 */
export interface RuntimeConfig {
  /**
   * Maximum consecutive stalls before giving up.
   * Default: 3
   */
  maxStallCount?: number;

  /**
   * Run independent tasks in parallel.
   * Default: true
   */
  parallelExecution?: boolean;

  /**
   * Maximum number of tasks running in parallel.
   * Default: 5
   */
  maxParallelTasks?: number;

  /**
   * Save checkpoints after each iteration (enables `converge resume`).
   * Default: true
   */
  enableCheckpoints?: boolean;

  /**
   * Minimum log level to display.
   * Default: 'info'
   */
  logLevel?: "debug" | "info" | "warn" | "error";

  /**
   * Output logs as newline-delimited JSON (for CI/log aggregation).
   * Default: false
   */
  jsonLogs?: boolean;

  /**
   * Active milestone ID.
   *
   * When set, only tasks tagged with this same milestone ID — or tasks with NO
   * milestone tag — are executed. Tasks tagged with a different milestone are
   * skipped and logged.
   *
   * Example values: `'html-design'`, `'react-impl'`, `'data-analysis'`
   * Leave undefined to execute all tasks regardless of milestone tagging.
   */
  milestone?: string;

  /**
   * Self-repair configuration.
   * When enabled, converge can detect and fix its own bugs autonomously.
   *
   * @example
   * selfRepair: {
   *   enabled: true,
   *   maxAttempts: 3,
   *   allowedFiles: ['packages/core/src/**\/*.ts']
   * }
   */
  selfRepair?: {
    /** Enable autonomous self-repair. Default: false */
    enabled?: boolean;
    /** Max repair attempts per error. Default: 3 */
    maxAttempts?: number;
    /** Require TypeScript validation. Default: true */
    requireValidation?: boolean;
    /** Git commit before repair. Default: true */
    backupBeforeRepair?: boolean;
    /** Only repair these files (glob patterns). Default: ['packages/core/src/**\/*.ts'] */
    allowedFiles?: string[];
    /** Never modify these files (glob patterns). Default: ['packages/core/src/self-repair/**\/*.ts'] */
    excludedFiles?: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Converge Config (root)                                             */
/* ------------------------------------------------------------------ */

/**
 * Root configuration object for `.converge/PROJECT.md`.
 *
 * @example
 * ---
 * name: My App
 * discovery:
 *   watch: true
 * plugins:
 *   - typescript
 * variables:
 *   env: production
 * hooks:
 *   task:fail: ./scripts/on-fail.sh
 * runtime:
 *   maxIterations: 50
 *   parallelExecution: true
 * ---
 */
export interface ConvergeConfig {
  /** Human-readable project name (required) */
  name: string;

  /** Optional project description */
  description?: string;

  /**
   * Project working directory.
   * Defaults to the directory containing `.converge/PROJECT.md`.
   */
  dir?: string;

  /**
   * Auto-discovery configuration — where to find tasks, epics, checks, etc.
   * When set, Converge scans these paths and registers found functions
   * automatically (no manual `.task()` / `.epic()` calls needed).
   */
  discovery?: DiscoveryConfig;

  /**
   * Plugins to load.
   * Accepts: string name, [name, options] tuple, or { name, options } object.
   *
   * @example
   * plugins: ['typescript', ['eslint', { fix: true }]]
   */
  plugins?: PluginEntry[];

  /**
   * Global variables accessible to all tasks, epics, and checks via `ctx.vars`.
   */
  variables?: Record<string, unknown>;

  /**
   * Lifecycle hooks — typed callbacks for every stage of execution.
   * Hook errors are isolated and never crash the workflow.
   *
   * @example
   * hooks: {
   *   'project:start': async ({ ctx }) => ctx.log.info('Starting'),
   *   'task:fail':     async ({ ctx, error }) => alert(error.message),
   * }
   */
  hooks?: ConvergeHooks;

  /**
   * Runtime tuning parameters.
   */
  runtime?: RuntimeConfig;

  /**
   * Named agent definition paths (relative to project dir).
   * Agents are AI agent definition files (.md) used by the autonomous loop.
   *
   * @example
   * agents: { default: '.converge/agents/main.md' }
   */
  agents?: Record<string, string>;

  /**
   * Named skill definition paths (relative to project dir).
   *
   * @example
   * skills: { planning: '.converge/skills/planning.md' }
   */
  skills?: Record<string, string>;

  /**
   * AI provider configuration.
   * Supports multiple providers with one designated as default.
   *
   * @example
   * # Single provider (legacy/simple mode)
   * ai:
   *   provider: acp
   *   apiKey: sk-...
   *   baseUrl: https://api.moonshot.cn/v1
   *
   * @example
   * # Multiple providers with default
   * ai:
   *   default: kimi
   *   providers:
   *     claude:
   *       provider: claude
   *     kimi:
   *       provider: acp
   *       apiKey: sk-...
   *       baseUrl: https://api.moonshot.cn/v1
   *       model: moonshot-v1-8k
   */
  ai?: AIConfig | AIMultiProviderConfig;
}

/* ------------------------------------------------------------------ */
/*  AI Config                                                          */
/* ------------------------------------------------------------------ */

/**
 * Base AI provider configuration.
 * The provider type is determined by the key in the providers map.
 */
export interface AIConfig {
  /**
   * Provider type - only needed for single-provider config.
   * In multi-provider config, the key IS the provider type.
   */
  provider?: "claude" | "acp" | "kimi" | "qwen" | "gemini";

  /** API key for the AI provider */
  apiKey?: string;

  /** Base URL for the AI API (e.g., https://api.moonshot.cn/v1) */
  baseUrl?: string;

  /** Model to use (provider-specific) */
  model?: string;

  /** Maximum timeout in milliseconds for AI calls */
  timeoutMs?: number;

  /** Maximum retries on failure */
  maxRetries?: number;
}

/**
 * Claude CLI provider configuration.
 * Uses Anthropic's Claude CLI - no custom API settings needed.
 */
export interface ClaudeProviderConfig extends AIConfig {
  provider?: "claude";
}

/**
 * ACP (Agent SDK) provider configuration.
 * Supports custom APIs like Kimi, OpenAI-compatible endpoints.
 */
export interface ACPProviderConfig extends AIConfig {
  provider?: "acp";
  /** API key for custom endpoint */
  apiKey: string;
  /** Base URL for custom API */
  baseUrl: string;
  model?: string;
}

/**
 * Kimi direct API provider configuration (via kimifn).
 */
export interface KimiProviderConfig extends AIConfig {
  provider?: "kimi";
  apiKey?: string;
}

/**
 * Multiple AI providers configuration.
 * Provider type is determined by the key name (claude, acp, kimi, qwen, gemini).
 */
export interface AIMultiProviderConfig {
  /** Name of the default provider to use (must match a key in providers) */
  default: string;

  /**
   * Map of provider name to configuration.
   * Key is the provider type: 'claude', 'acp', 'kimi', 'qwen', 'gemini'
   */
  providers: {
    claude?: ClaudeProviderConfig;
    acp?: ACPProviderConfig;
    kimi?: KimiProviderConfig;
    qwen?: AIConfig;
    gemini?: AIConfig;
    [key: string]: AIConfig | undefined; // Allow custom named providers
  };
}
