import { existsSync } from "node:fs";

/**
 * Filesystem-Native Storage Types
 *
 * Separates authored configuration (YAML) from runtime state (status, logs).
 * Git-friendly: status files can be gitignored, authored config is committed.
 *
 * Structure:
 * ```
 * .converge/
 * ├── project.yaml          # Authored: variables, plugins
 * ├── epics/
 * │   ├── 00-foundation.yaml       # Authored: epic definition
 * │   ├── 00-foundation.status.yaml  # Runtime: execution state
 * │   ├── 00-foundation.deps.yaml    # Runtime: dependencies
 * │   ├── 00-foundation.log.md       # Runtime: execution log
 * │   └── tasks/
 * │       ├── setup-db.yaml          # Authored: task definition
 * │       ├── setup-db.status.yaml   # Runtime: task status
 * │       └── setup-db.log.md        # Runtime: task log
 * ├── checkpoints/          # Runtime: recovery checkpoints
 * ├── gaps/                 # Runtime: gap snapshots
 * └── provenance/           # Runtime: what created what
 * ```
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Metrics & Pricing Configuration                                   */
/* ------------------------------------------------------------------ */

/**
 * Model pricing per 1M tokens
 */
export const ModelPricingSchema = z.object({
  /** Price per 1M input tokens */
  inputPer1M: z.number(),
  /** Price per 1M output tokens */
  outputPer1M: z.number(),
});

export type ModelPricing = z.infer<typeof ModelPricingSchema>;

/**
 * Subscription pricing configuration
 */
export const SubscriptionConfigSchema = z.object({
  /** Enable subscription-based cost calculation */
  enabled: z.boolean().default(false),
  /** Flat fee per billing period ($20/month) */
  flatFee: z.number(),
  /** Request quota per billing window (e.g., 4500 per 5 hours) */
  requestsIncluded: z.number(),
});

export type SubscriptionConfig = z.infer<typeof SubscriptionConfigSchema>;

/**
 * Metrics configuration with model pricing and subscription
 */
export const MetricsConfigSchema = z.object({
  /** Pricing per model (used when provider doesn't return cost) */
  pricing: z.record(z.string(), ModelPricingSchema).optional(),
  /** Default model if not specified */
  defaultModel: z.string().optional(),
  /** Subscription pricing (mutually exclusive with per-token pricing) */
  subscription: SubscriptionConfigSchema.optional(),
});

export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;

/* ------------------------------------------------------------------ */
/*  AI Configuration                                                  */
/* ------------------------------------------------------------------ */

/**
 * AI provider configuration for a single provider
 */
export const AIProviderConfigSchema = z
  .object({
    provider: z
      .enum(["claude", "acp", "kimi", "qwen", "gemini", "openfn", "codex", "deepcode"])
      .optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    model: z.string().optional(),
    timeoutMs: z.number().optional(),
    maxRetries: z.number().optional(),
    /** Environment variables to set when running this provider (e.g., for Claude CLI with Kimi) */
    env: z.record(z.string()).optional(),
  })
  .passthrough();

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema>;

/**
 * Multi-provider AI configuration
 */
export const AIMultiProviderConfigSchema = z
  .object({
    default: z.string(),
    providers: z.record(z.string(), AIProviderConfigSchema.passthrough()),
  })
  .passthrough();

export type AIMultiProviderConfig = z.infer<typeof AIMultiProviderConfigSchema>;

/**
 * AI configuration - can be single provider or multi-provider
 *
 * Uses a discriminated approach: if 'providers' field exists, it's multi-provider.
 * Otherwise, it's single-provider.
 */
export const AIConfigSchema = z.union([
  // Multi-provider config (must come first - has required 'providers' field)
  AIMultiProviderConfigSchema,
  // Single provider config
  AIProviderConfigSchema,
]);

export type AIConfig = z.infer<typeof AIConfigSchema>;

/* ------------------------------------------------------------------ */
/*  Project Configuration (Authored)                                  */
/* ------------------------------------------------------------------ */

/**
 * Project configuration schema (project.yaml)
 * This is the authored source of truth for project configuration.
 */
export const ProjectConfigSchema = z.object({
  version: z.literal(2).default(2),
  name: z.string(),
  description: z.string().optional(),

  /** Variables accessible to all tasks */
  variables: z.record(z.unknown()).default({}),

  /** Plugins to load */
  plugins: z
    .array(
      z.union([
        z.string(), // "typescript"
        z.tuple([z.string(), z.record(z.unknown())]), // ["nextjs", { appDir: true }]
        z.object({
          name: z.string(),
          options: z.record(z.unknown()).optional(),
        }),
      ]),
    )
    .default([]),

  /** Epic IDs in execution order */
  epics: z.array(z.string()).default([]),

  /** AI provider configuration */
  ai: z.union([AIProviderConfigSchema, AIMultiProviderConfigSchema]).optional(),

  /** Metrics and pricing configuration */
  metrics: MetricsConfigSchema.optional(),

  /** Project metadata */
  metadata: z
    .object({
      created: z.string(),
      updated: z.string(),
    })
    .optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/* ------------------------------------------------------------------ */
/*  Legacy Epic Types (internal, for runtime compatibility)             */
/* ------------------------------------------------------------------ */

/**
 * @internal For runtime compatibility only. Do not use in new code.
 * @deprecated Use PlaybookConfig instead.
 */
export const EpicConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  tasks: z.array(z.string()).default([]),
});
export type EpicConfig = z.infer<typeof EpicConfigSchema>;

/**
 * @internal For runtime compatibility only. Do not use in new code.
 * @deprecated Use PlaybookStatus instead.
 */
export const EpicStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["planned", "active", "completed", "blocked", "failed"]),
  currentGaps: z.array(z.string()).default([]),
  lastEvaluation: z.string().optional(),
  attempts: z.number().default(0),
  metadata: z
    .object({
      started: z.string().optional(),
      completed: z.string().optional(),
      lastUpdated: z.string(),
    })
    .optional(),
});
export type EpicStatus = z.infer<typeof EpicStatusSchema>;

/**
 * @internal For runtime compatibility only. Do not use in new code.
 * @deprecated Use PlaybookDeps instead.
 */
export const EpicDepsSchema = z.object({
  id: z.string(),
  blocking: z.array(z.string()).default([]),
  blockedBy: z.array(z.string()).default([]),
  resolvedDeps: z.array(z.string()).default([]),
  unresolvedDeps: z.array(z.string()).default([]),
});
export type EpicDeps = z.infer<typeof EpicDepsSchema>;

/* ------------------------------------------------------------------ */
/*  Playbook Configuration (Authored)                                   */
/* ------------------------------------------------------------------ */

/**
 * Playbook config schema (.converge/playbooks/{playbookId}.yaml)
 * Authored playbook definition.
 */
export const PlaybookConfigSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  tasks: z.array(z.string()).default([]),
});
export type PlaybookConfig = z.infer<typeof PlaybookConfigSchema>;

/**
 * Playbook status schema (.converge/playbooks/{playbookId}.status.yaml)
 * Runtime execution state.
 */
export const PlaybookStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["planned", "active", "completed", "blocked", "failed"]),
  currentGaps: z.array(z.string()).default([]),
  attempts: z.number().default(0),
  metadata: z
    .object({
      lastUpdated: z.string(),
      started: z.string().optional(),
      completed: z.string().optional(),
    })
    .optional(),
});
export type PlaybookStatus = z.infer<typeof PlaybookStatusSchema>;

/**
 * Playbook deps schema (.converge/playbooks/{playbookId}.deps.yaml)
 */
export const PlaybookDepsSchema = z.object({
  id: z.string(),
  dependsOn: z.array(z.string()).default([]),
});
export type PlaybookDeps = z.infer<typeof PlaybookDepsSchema>;

/* ------------------------------------------------------------------ */
/*  Task Configuration (Authored)                                     */
/* ------------------------------------------------------------------ */

/**
 * Task configuration schema (epics/{epicId}/tasks/{taskId}.yaml)
 * Authored task definition.
 */
export const TaskConfigSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),

  /** Task type (e.g., 'coding', 'testing', 'verify') */
  type: z.string().optional(),

  /** Function reference for execution */
  fn: z.string().optional(),

  /** Dependencies on other tasks */
  deps: z.array(z.string()).default([]),

  /** Input files */
  inputs: z.array(z.string()).optional(),

  /** Output files */
  outputs: z.array(z.string()).optional(),

  /** Variables for this task */
  vars: z.record(z.unknown()).optional(),

  /** Checks to run */
  checks: z.array(z.string()).optional(),

  /** Constraints */
  constraints: z
    .object({
      sequential: z.boolean().optional(),
      parallel: z.boolean().optional(),
      maxAttempts: z.number().default(3),
      timeout: z.number().optional(),
      condition: z.string().optional(),
    })
    .optional(),

  /** Metadata */
  metadata: z
    .object({
      created: z.string().optional(),
      updated: z.string().optional(),
      filePath: z.string().optional(), // Path to SKILL.md or task.ts
      isSkillOnly: z.boolean().optional(), // True if task has SKILL.md but no task.ts
    })
    .optional(),

  /** RFC 0021: stub command — runs instead of real executor in --stub mode. */
  stub: z
    .object({
      cmd: z.string(),
      cleanup: z.string().optional(),
    })
    .optional(),
});

export type TaskConfig = z.infer<typeof TaskConfigSchema>;

/**
 * Task status schema (epics/{epicId}/tasks/{taskId}.status.yaml)
 * Runtime execution state.
 */
export const TaskStatusSchema = z.object({
  id: z.string(),
  status: z.enum([
    "pending",
    "active",
    "completed",
    "blocked",
    "failed",
    "skipped",
  ]),
  currentGaps: z.array(z.string()).default([]),
  lastEvaluation: z.string().optional(),
  attempts: z.number().default(0),
  lastAttempt: z
    .object({
      number: z.number(),
      started: z.string(),
      completed: z.string().optional(),
      success: z.boolean().optional(),
      error: z.string().optional(),
    })
    .optional(),
  metadata: z
    .object({
      started: z.string().optional(),
      completed: z.string().optional(),
      lastUpdated: z.string(),
    })
    .optional(),
});

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/* ------------------------------------------------------------------ */
/*  Gap Tracking                                                      */
/* ------------------------------------------------------------------ */

/**
 * Gap type enumeration
 */
export const GapTypeSchema = z.enum([
  "structural", // Missing files, directories, modules
  "semantic", // Logic errors, incorrect implementation
  "quality", // Style, performance, maintainability issues
  "integration", // Integration failures, API mismatches
  "missing-intermediate", // Missing intermediate task in pipeline
  "incomplete", // Task not fully completed
  "missing-dependency", // Required dependency not available
]);

export type GapType = z.infer<typeof GapTypeSchema>;

/**
 * Gap schema for tracking detected gaps
 */
export const GapSchema = z.object({
  id: z.string(),
  type: GapTypeSchema,
  level: z.enum(["project", "task"]),
  scope: z.string(), // Project/epic/task ID
  description: z.string(),
  detected: z.string(),
  resolved: z.boolean().default(false),
  resolvedAt: z.string().optional(),
  checks: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

export type Gap = z.infer<typeof GapSchema>;

/**
 * Gap snapshot schema (gaps/{timestamp}.yaml)
 */
export const GapSnapshotSchema = z.object({
  timestamp: z.string(),
  iteration: z.number(),
  gaps: z.array(GapSchema),
  summary: z.object({
    total: z.number(),
    byType: z.record(z.number()),
    byLevel: z.record(z.number()),
  }),
});

export type GapSnapshot = z.infer<typeof GapSnapshotSchema>;

/* ------------------------------------------------------------------ */
/*  Checkpoint (for resumability)                                     */
/* ------------------------------------------------------------------ */

/**
 * Execution level for tree traversal cursor
 * Represents one level in the execution stack
 */
export const ExecutionLevelSchema = z.object({
  id: z.string(),
  type: z.enum(["playbook", "task", "subtask"]),
  filePath: z.string(),
  depth: z.number(),
});

export type ExecutionLevel = z.infer<typeof ExecutionLevelSchema>;

/**
 * Hierarchical cursor for tree traversal
 * Records position in depth-first traversal of task hierarchy
 * This is ALL we need - the tree traversal will naturally resume from this position
 */
export const CursorSchema = z.object({
  /** Path from root: ["epic-01", "task-003", "subtask-002"] */
  path: z.array(z.string()),

  /** Breadcrumbs with file paths for navigation */
  breadcrumbs: z.array(ExecutionLevelSchema),

  /** Current nesting depth (0=epic, 1=task, 2=subtask, etc.) */
  depth: z.number(),
});

export type Cursor = z.infer<typeof CursorSchema>;

/**
 * Execution context at checkpoint time
 * Minimal state needed to resume execution naturally
 */
export const ExecutionContextSchema = z.object({
  /** Current iteration number */
  iteration: z.number(),

  /** Completed unit IDs (for skipping on resume) */
  completedUnits: z.array(z.string()),

  /** Root unit file path */
  rootPath: z.string(),
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

/**
 * Simplified Checkpoint Schema (V3)
 *
 * Philosophy: Checkpoint stores ONLY cursor + execution context.
 * The tree traversal naturally resumes from cursor position.
 * No duplicate tree logic, no completion trees, no snapshots.
 *
 * The tree IS the source of truth - just navigate to cursor and continue.
 */
export const CheckpointSchema = z.object({
  /** Schema version (accepts 2 for migrated checkpoints, defaults to 3) */
  version: z.union([z.literal(2), z.literal(3)]).default(3),

  /** Checkpoint ID */
  id: z.string(),

  /** Timestamp */
  timestamp: z.string(),

  /** Cursor position in tree (optional for migrated v1 checkpoints) */
  cursor: CursorSchema.optional(),

  /** Execution context */
  context: ExecutionContextSchema.optional(),

  /** Metadata */
  metadata: z
    .object({
      created: z.string(),
      machine: z.string().optional(),
      commit: z.string().optional(),
    })
    .optional(),

  /* -- Legacy V1/V2 fields (kept for migration/compat) -- */
  state: z
    .object({
      currentEpic: z.string().optional(),
      currentTask: z.string().optional(),
      phase: z.enum(["evaluate", "plan", "execute", "verify"]).optional(),
    })
    .optional(),
  gaps: z.array(GapSchema).optional(),
  iteration: z.number().optional(),
  completed: z
    .object({
      epics: z.array(z.string()),
      tasks: z.array(z.string()),
    })
    .optional(),
  treeSnapshot: z.unknown().optional(),
  completionTree: z.unknown().optional(),
  completedTasks: z.array(z.string()).optional(),
  failedTasks: z.array(z.string()).optional(),
  seededTasks: z.array(z.string()).optional(),
  lockedTasks: z.array(z.string()).optional(),
  taskAttempts: z.record(z.number()).optional(),
  taskMetadata: z.record(z.unknown()).optional(),
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

/* -- Legacy types used by checkpoint/migration.ts -- */

/** Node in a completion tree (legacy) */
export interface CompletionNode {
  id: string;
  status: string;
  completedAt?: string;
  childIds: string[];
}

/** Completion tree (legacy) */
export interface CompletionTree {
  nodes: Record<string, CompletionNode>;
}

/** Tree snapshot for structure-change detection (legacy) */
export interface TreeSnapshot {
  structureHash: string;
  taskPaths: string[];
}

/**
 * Legacy v1 checkpoint schema (for migration)
 */
export const CheckpointV1Schema = z.object({
  id: z.string(),
  timestamp: z.string(),
  iteration: z.number(),
  state: z.object({
    currentEpic: z.string().optional(),
    currentTask: z.string().optional(),
    phase: z.enum(["evaluate", "plan", "execute", "verify"]),
  }),
  gaps: z.array(GapSchema),
  completed: z.object({
    epics: z.array(z.string()),
    tasks: z.array(z.string()),
  }),
  metadata: z.object({
    created: z.string(),
    machine: z.string().optional(),
    commit: z.string().optional(),
  }),
});

export type CheckpointV1 = z.infer<typeof CheckpointV1Schema>;

/* ------------------------------------------------------------------ */
/*  Provenance Tracking                                               */
/* ------------------------------------------------------------------ */

/**
 * Provenance record schema (provenance/{entityId}.yaml)
 * Tracks what created what and why.
 */
export const ProvenanceRecordSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(["task", "file", "check"]),
  created: z.string(),
  createdBy: z.enum(["user", "planner", "executor", "migrator"]),

  /** What triggered creation */
  trigger: z
    .object({
      type: z.enum(["gap", "dependency", "manual", "migration"]),
      source: z.string().optional(),
      reason: z.string().optional(),
    })
    .optional(),

  /** Related entities */
  related: z
    .object({
      parent: z.string().optional(),
      children: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
    })
    .optional(),

  /** Change history */
  changes: z
    .array(
      z.object({
        timestamp: z.string(),
        field: z.string(),
        oldValue: z.unknown().optional(),
        newValue: z.unknown().optional(),
        reason: z.string().optional(),
      }),
    )
    .optional(),
});

export type ProvenanceRecord = z.infer<typeof ProvenanceRecordSchema>;

/* ------------------------------------------------------------------ */
/*  Storage Paths                                                     */
/* ------------------------------------------------------------------ */

/**
 * Standard paths for filesystem-native storage
 */
export interface StoragePaths {
  root: string; // .converge/
  project: string; // .converge/project.yaml
  playbooks: string; // .converge/playbooks/
  checkpoints: string; // .converge/checkpoints/
  gaps: string; // .converge/gaps/
  provenance: string; // .converge/provenance/

  /** Get playbook config path */
  playbookConfig: (playbookId: string) => string;
  /** Get playbook status path */
  playbookStatus: (playbookId: string) => string;
  /** Get playbook deps path */
  playbookDeps: (playbookId: string) => string;
  /** Get playbook log path */
  playbookLog: (playbookId: string) => string;
  /** Get playbook tasks directory */
  playbookTasks: (playbookId: string) => string;

  /** Get task config path */
  taskConfig: (playbookId: string, taskId: string) => string;
  /** Get task status path */
  taskStatus: (playbookId: string, taskId: string) => string;
  /** Get task log path */
  taskLog: (playbookId: string, taskId: string) => string;
}

/**
 * Create storage paths helper
 */
function detectProjectFile(convergeDir: string): string {
  const ymlPath = `${convergeDir}/project.yml`;
  if (existsSync(ymlPath)) return ymlPath;
  return `${convergeDir}/project.yaml`;
}

export function createStoragePaths(
  convergeDir: string = ".converge",
): StoragePaths {
  return {
    root: convergeDir,
    project: detectProjectFile(convergeDir),
    playbooks: `${convergeDir}/playbooks`,
    checkpoints: `${convergeDir}/checkpoints`,
    gaps: `${convergeDir}/gaps`,
    provenance: `${convergeDir}/provenance`,

    playbookConfig: (playbookId: string) => `${convergeDir}/playbooks/${playbookId}.yaml`,
    playbookStatus: (playbookId: string) =>
      `${convergeDir}/playbooks/${playbookId}.status.yaml`,
    playbookDeps: (playbookId: string) => `${convergeDir}/playbooks/${playbookId}.deps.yaml`,
    playbookLog: (playbookId: string) => `${convergeDir}/playbooks/${playbookId}.log.md`,
    playbookTasks: (playbookId: string) => `${convergeDir}/playbooks/${playbookId}/tasks`,

    taskConfig: (playbookId: string, taskId: string) =>
      `${convergeDir}/playbooks/${playbookId}/tasks/${taskId}.yaml`,
    taskStatus: (playbookId: string, taskId: string) =>
      `${convergeDir}/playbooks/${playbookId}/tasks/${taskId}.status.yaml`,
    taskLog: (playbookId: string, taskId: string) =>
      `${convergeDir}/playbooks/${playbookId}/tasks/${taskId}.log.md`,
  };
}
