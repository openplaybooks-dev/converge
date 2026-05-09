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

  /**
   * Input that distinguishes each run.
   * Used to generate the epicId: `{name}-{key_value}`
   */
  key?: string;

  /** Input variables (passed as --key=value on CLI) */
  inputs?: Record<string, PlaybookInput>;

  /** Execution configuration */
  run?: PlaybookRunConfig;

  /** Task pipeline — ordering and dependencies */
  tasks: PlaybookTask[];

  /** Post-run checks */
  checks?: PlaybookCheck[];

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
 * Execution configuration.
 */
export interface PlaybookRunConfig {
  mode?: "oneoff" | "converge" | "loop" | "dispatch";
  maxTaskAttempts?: number;
  /** Wall-clock timeout in ms. YAML supports: "60m", "2h", "infinite". */
  maxDuration?: number;
  resume?: boolean;
  maxGoals?: number;
  /** Stall detection configuration */
  stall?: {
    /** Max consecutive stalled epochs before stopping. 0 = never stop. Default: 2 for converge, 0 for loop. */
    maxConsecutive?: number;
    /** Delay in ms between stalled cycles. Default: 30000. */
    backoffMs?: number;
  };
}

/**
 * A post-run check.
 *
 * Three shapes:
 *   - inline cmd: { id, cmd }
 *   - inline ai:  { id, type: "ai", check, ... }
 *   - test ref:   { id, type: "test", name, args }
 *
 * Test refs are resolved against the test registry (built from
 * .converge/playbooks/&#42;/tests/&#42;.test.md) at consumption time.
 */
export interface PlaybookCheck {
  id: string;
  /** Optional human-readable description for any check shape. */
  description?: string;
  /** Bash command for type:"cmd" checks (default). */
  cmd?: string;
  /** Discriminator. Defaults to "cmd" when absent. */
  type?: "cmd" | "ai" | "test";
  /** Plain-English assertion the AI judge verifies; required for type:"ai". */
  check?: string;
  /** Optional AI provider override. */
  agent?: string;
  /** Optional AI model override. */
  model?: string;
  /** Optional per-check timeout (ms). */
  timeoutMs?: number;
  /** Test name for type:"test" — looked up in the test registry. */
  name?: string;
  /** Test arguments for type:"test", passed by name to the test definition. */
  args?: Record<string, string>;
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
