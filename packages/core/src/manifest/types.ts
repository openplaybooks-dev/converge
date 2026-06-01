export const MANIFEST_VERSION = 1;

interface ManifestNodeBase {
  id: string;
  depends_on: string[];
  depended_on_by: string[];
  tags: string[];
  testRefs?: string[];
  checks: string[];
  inputs: string[];
  outputs: string[];
  agent?: string;
  /** RFC 0021: stub command and cleanup — serialized from TASK.md stub: block */
  stub?: { cmd: string; cleanup?: string };
  frontmatter_hash: string;
  body_hash: string;
  checks_hash: string;
  inputs_hash: string;
  upstream_hash: string;
}

export interface ConcreteNode extends ManifestNodeBase {
  state: "concrete";
  path: string;
  seed: string | null;
}

export interface ExpectedNode extends ManifestNodeBase {
  state: "expected";
  seed_parent: string;
  predicted_from: string;
}

export interface FrontierNode extends ManifestNodeBase {
  state: "frontier";
  seed_parent: string;
}

export type ManifestNode = ConcreteNode | ExpectedNode | FrontierNode;

export interface ManifestMetadata {
  playbook: string;
  playbook_hash?: string;
  manifest_version?: number;
  generated_at: string;
  converge_version: string;
  frontier_count: number;
}

export interface Manifest {
  metadata: ManifestMetadata;
  nodes: Record<string, ManifestNode>;
  child_map: Record<string, string[]>;
  parent_map: Record<string, string[]>;
}

/* ------------------------------------------------------------------ */
/*  RunState — the single source-of-truth execution DAG                */
/* ------------------------------------------------------------------ */

export interface CheckResultItem {
  id: string;
  description?: string;
  cmd?: string;
  passed: boolean;
  exit_code?: number;
  output?: string;
}

export interface AttemptDetail {
  attempt: number;
  status: "running" | "pass" | "error" | "blocked";
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  error_message?: string;
  check_results?: CheckResultItem[];
  output_hashes?: Record<string, string>;
}

/** Serializable check shape stored in RunStateNode.checks */
export interface RunStateCheck {
  id: string;
  description?: string;
  cmd?: string;
  type?: string;
  check?: string;
  name?: string;
  args?: Record<string, string>;
}

export interface RunStateNode {
  id: string;
  status: "pending" | "running" | "pass" | "error" | "blocked" | "skipped" | "seeded";
  attempts: number;
  duration_ms: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  worker_id?: string;
  lease_id?: string;
  lease_started_at?: string;
  heartbeat_at?: string;

  /** Upstream task IDs this node depends on */
  depends_on: string[];
  /** Downstream task IDs that depend on this node */
  depended_on_by: string[];

  /* Task context (from TaskDefinition) */
  title?: string;
  description?: string;
  inputs: string[];
  outputs: string[];
  checks: RunStateCheck[];
  tags: string[];
  agent?: string;
  skill?: string | string[];
  vars?: Record<string, unknown>;

  /** Relative path from project root to journal task directory */
  journal_path: string;
  /** Absolute or relative path to the source TASK.md / definition */
  source_path?: string;

  /** Child task IDs spawned dynamically by this task (mode: spawner / converger via converge apply) */
  spawned_children: string[];
  /** If dynamically spawned, the parent task ID. Wire-format field on
   *  manifest/runstate nodes — preserved for runstate.json compatibility. */
  from_seed?: string;
  seed?: string | null;

  /** SHA-256 fingerprint of task definition (TASK.md content + checks + inputs). Used for change detection. */
  fingerprint?: string;

  /** SHA-256 hashes of produced output files */
  output_hashes?: Record<string, string>;

  /** Per-attempt execution history */
  attempts_detail: AttemptDetail[];

  /** Visual grouping label for the Studio. Source: TASK.md frontmatter `group:` field. Display-only — no runtime semantics. */
  group?: string;
  /** DAG node type — set at compile time. */
  dag_type?: "normal" | "diverge" | "converge" | "hook";
  /** If true, converge node has no body and completes immediately. */
  converge_passthrough?: boolean;
  /** If true, task runs shell script directly without AI convergence loop. */
  passthrough?: boolean;

  /**
   * Full task definition stored at compile time.
   * Run uses this instead of reading TASK.md from the filesystem.
   */
  task_def?: {
    title?: string;
    description?: string;
    inputs: string[];
    outputs: string[];
    checks: RunStateCheck[];
    tags: string[];
    agent?: string;
    skill?: string | string[];
    vars?: Record<string, unknown>;
    handoff?: unknown;
    body?: string;
  };
}

export interface RunStateDag {
  nodes: Record<string, RunStateNode>;
  edges: Array<{ from: string; to: string }>;
  roots: string[];
}

export interface RunState {
  metadata: {
    execution_id: string;
    selector: string;
    playbook: string;
    status: "running" | "complete" | "error";
    playbook_hash?: string;
    generated_at: string;
    completed_at?: string;
    converge_version: string;
    total_nodes: number;
  };
  dag: RunStateDag;
}

/** Payload passed to markComplete / markFailed with per-attempt detail. */
export interface CompletionData {
  title?: string;
  description?: string;
  agent?: string;
  skill?: string | string[];
  from_seed?: string;
  check_results?: CheckResultItem[];
  output_hashes?: Record<string, string>;
}

export class ManifestVersionError extends Error {
  constructor(expected: number, found: number) {
    super(`MANIFEST_VERSION mismatch: expected ${expected}, found ${found}`);
    this.name = "ManifestVersionError";
  }
}
