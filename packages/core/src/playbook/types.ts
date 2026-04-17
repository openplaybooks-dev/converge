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
 *     tasks/                ← multiple TASK.md files with their own deps, wbs, etc.
 *
 * Keyed:
 *   playbooks/fix-issue/
 *     playbook.yml          ← name, inputs, key, run config
 *     tasks/
 *       TASK.md             ← root task with wbs: in frontmatter (uses standard task API)
 *       wbs.js              ← spawns child tasks per key value
 *
 * The playbook.yml is pure config. All task behavior (dependencies, checks,
 * wbs, blocking, etc.) lives in TASK.md frontmatter — the standard task API.
 *
 * Journal: .converge/journal/{name}/
 *   tasks/                  ← task execution records
 *   sessions/               ← session logs
 *   trends.jsonl            ← one line per run
 *   playbook.json           ← metadata
 */

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
}

/**
 * A task entry in the playbook pipeline.
 * Either a local task (id) or a playbook reference (playbook).
 */
export interface PlaybookTask {
  /** Local task ID */
  id?: string;
  /** Referenced playbook name */
  playbook?: string;
  /** Input variable pass-through for playbook references */
  with?: Record<string, string>;
  /** Task dependencies */
  depends_on?: string[];
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
  mode?: 'autonomous' | 'converge' | 'step';
  maxIterations?: number;
  maxTaskAttempts?: number;
  /** Wall-clock timeout in ms. YAML supports: "60m", "2h", "infinite". */
  maxDuration?: number;
  resume?: boolean;
  maxGoals?: number;
}

/**
 * A post-run check.
 */
export interface PlaybookCheck {
  id: string;
  cmd: string;
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
