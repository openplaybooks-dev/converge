/**
 * Playbook Types
 *
 * A playbook is the root unit of organization. Everything lives under a playbook.
 *
 * Two patterns — same structure, different task content:
 *
 * Continuous:
 *   playbooks/default/
 *     playbook.yml          ← name, run config
 *     tasks/                ← multiple TASK.md files with their own deps, seedData, etc.
 *
 * Keyed:
 *   playbooks/fix-issue/
 *     playbook.yml          ← name, inputs, key, run config
 *     tasks/
 *       TASK.md             ← root task with seed: in frontmatter (uses standard task API)
 *       seed.js              ← spawns child tasks per key value
 *
 * The playbook.yml is pure config. All task behavior (dependencies, checks,
 * seedData, blocking, etc.) lives in TASK.md frontmatter — the standard task API.
 *
 * Journal: .converge/journal/{name}/
 *   tasks/                  ← task execution records
 *   sessions/               ← session logs
 *   trends.jsonl            ← one line per run
 *   playbook.json           ← metadata
 */

import type { HookDefinition } from "../../hooks/hook-definition.ts";

/* ------------------------------------------------------------------ */
/*  playbook.yml schema                                                */
/* ------------------------------------------------------------------ */

/**
 * Parsed playbook.yml — pure config, no task definitions.
 */
export interface PlaybookDef {
  /** Unique playbook name */
  name: string;

  /** Human-readable description */
  description?: string;

  /** Seeding API version (v1 enables strict CLI-emission seeding contract). */
  seed_api_version?: number;

  /**
   * Input that distinguishes each run.
   * Used to generate the epicId: `{name}-{key_value}`
   */
  key?: string;

  /** Input variables (passed as --key=value on CLI) */
  inputs?: Record<string, PlaybookInput>;

  /** Execution configuration */
  run?: PlaybookRunConfig;

  /** Goals — measurable completion conditions for goal-driven epoch loops */
  goals?: PlaybookGoal[];

  /** Task pipeline — ordering and dependencies */
  tasks: PlaybookTask[];

  /** Hook definitions — match tasks by filter, create companion DAG nodes */
  hooks?: HookDefinition[];
}

/**
 * A task entry in the playbook pipeline.
 * Either a local task (id) or a playbook reference (playbook).
 */
export interface PlaybookTask {
  /** Task identifier */
  id?: string;
  /** Task path relative to playbook tasks/ directory */
  path?: string;
  /** Referenced playbook name */
  playbook?: string;
  /** Dependencies on other tasks */
  depends_on?: string[];
  /** Input variable pass-through for playbook references */
  with?: Record<string, string>;
}

/**
 * An input variable declared by the playbook.
 */
export interface PlaybookInput {
  description?: string;
  required?: boolean;
  default?: string;
}

/**
 * A single check within a goal.
 * Exit 0 = this check passes.
 */
export interface PlaybookGoalCheck {
  /** Unique check identifier within the goal */
  id: string;
  /** Optional human-readable explanation of what this check proves */
  description?: string;
  /** Shell command — exit 0 means the check passes */
  cmd: string;
}

export type PlaybookGoalStatus =
  | "candidate"
  | "active"
  | "rejected"
  | "stalled";

/**
 * A goal declared by the playbook.
 * Goals are measurable completion conditions — epoch loops work toward them
 * until all are satisfied or the run budget is exhausted.
 * Each goal has one or more checks; the goal is satisfied when ALL checks pass.
 */
export interface PlaybookGoal {
  /** Unique goal identifier (kebab-case) */
  id: string;
  /** What "done" looks like — written for an LLM to understand the intent */
  description: string;
  /** Parent goal ID for adaptive goal trees */
  parent?: string;
  /** Goals that must be satisfied before this goal is buildable */
  depends_on?: string[];
  /** Runtime status. Static goals default to active when they have checks. */
  status?: PlaybookGoalStatus;
  /** Where this goal came from: user, static playbook, seed, verifier, etc. */
  source?: Record<string, unknown>;
  /** Free-form metadata for seed controllers and reporting */
  metadata?: Record<string, unknown>;
  /** Checks that must all pass for this goal to be satisfied */
  checks: PlaybookGoalCheck[];
}

/**
 * Execution configuration.
 */
export interface PlaybookRunConfig {
  /** Deprecated and ignored. Tasks/seeds decide whether to continue. */
  mode?: string;
  maxTaskAttempts?: number;
  /** Safety cap for DAG passes. Tasks/seeds decide whether more passes are needed. */
  maxIterations?: number;
  /** Wall-clock timeout in ms. YAML supports: "60m", "2h", "infinite". */
  maxDuration?: number;
  resume?: boolean;
  maxGoals?: number;
  /** Stall detection configuration */
  stall?: {
    /** Max consecutive stalled passes before stopping. 0 = never stop. Default: 2. */
    maxConsecutive?: number;
    /** Delay in ms between stalled cycles. Default: 30000. */
    backoffMs?: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Resolved Playbook                                                  */
/* ------------------------------------------------------------------ */

/**
 * A playbook resolved with input variables, ready for execution.
 */
export interface ResolvedPlaybook {
  def: PlaybookDef;
  vars: Record<string, string>;
  epicId: string;
  templateDir: string;
}

/* ------------------------------------------------------------------ */
/*  Playbook Source Metadata                                           */
/* ------------------------------------------------------------------ */

export interface PlaybookSource {
  def: PlaybookDef;
  templateDir: string;
  builtin: boolean;
}

/* ------------------------------------------------------------------ */
/*  Playbook Context (for path routing)                                */
/* ------------------------------------------------------------------ */

export interface PlaybookContext {
  playbook: string;
}

/* ------------------------------------------------------------------ */
/*  Trend Entry                                                        */
/* ------------------------------------------------------------------ */

export interface PlaybookTrendEntry {
  sessionId: string;
  timestamp: string;
  tasksTotal: number;
  tasksComplete: number;
  tasksFailed: number;
  totalAttempts: number;
  durationMs: number;
}
