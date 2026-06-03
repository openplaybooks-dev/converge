import { atomicWriteFile } from "../checkpoint/atomic-write.js";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { TaskDag } from "../dag/task-dag.js";
import type { Manifest, RunState, RunStateNode, RunStateCheck, CompletionData, AttemptDetail } from "./types.js";
import {
  appendTaskUpsert,
  readRuntimeLedgerState,
  runtimeTasksPath,
} from "../task/goal/runtime-ledger.js";

function hashManifest(manifest: Manifest): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(manifest)).digest("hex")}`;
}

/**
 * Type-guard: distinguish a Manifest (plain object with .nodes record) from
 * a TaskDag (class instance with .nodes Map).
 */
function isManifest(x: TaskDag | Manifest): x is Manifest {
  const n: any = (x as any).nodes;
  // Map has .size; plain object record has typeof "object" but not Map.
  return n && typeof n === "object" && typeof n.entries !== "function";
}

/**
 * Adapter: project a Manifest into the dag-like shape used by the
 * RunStateManager constructor (an iterable map of dag-node-shaped values
 * plus a `roots` array). Loses runtime status, but the constructor
 * initialises everything to "pending" anyway.
 */
function manifestToDagLike(manifest: Manifest): {
  nodes: Map<string, {
    taskDef: any;
    depends_on: string[];
    depended_on_by: string[];
    path: string;
    type: any;
    convergePassthrough?: boolean;
    spawned_children?: string[];
  }>;
  roots: Array<{ id: string }>;
  playbookName?: string;
} {
  const nodeMap = new Map();
  for (const [id, mn] of Object.entries(manifest.nodes)) {
    const node = mn as any;
    nodeMap.set(id, {
      taskDef: {
        title: node.title,
        description: node.description,
        inputs: node.inputs ?? [],
        outputs: node.outputs ?? [],
        checks: node.checks ?? [],
        tags: node.tags ?? [],
        agent: node.agent,
        skill: node.skill,
        vars: node.vars,
        prompt: node.body,
        from_seed: node.from_seed,
      },
      depends_on: node.depends_on ?? [],
      depended_on_by: node.depended_on_by ?? [],
      path: node.path ?? "",
      type: node.dag_type ?? "normal",
      convergePassthrough: node.converge_passthrough,
      spawned_children: node.spawned_children,
    });
  }
  // Roots = nodes with no dependencies.
  const roots: Array<{ id: string }> = [];
  for (const [id, mn] of Object.entries(manifest.nodes)) {
    if (!(mn as any).depends_on || (mn as any).depends_on.length === 0) {
      roots.push({ id });
    }
  }
  return {
    nodes: nodeMap,
    roots,
    playbookName: manifest.metadata?.playbook,
  };
}

/** Convert TaskDefinition checks to the serializable RunStateCheck array. */
function normalizeChecks(checks: unknown): RunStateCheck[] {
  if (!checks) return [];
  if (!Array.isArray(checks)) return [];
  return checks.map((c: any) => {
    if (typeof c === "string") return { id: c };
    return {
      id: c.id ?? "",
      description: c.description,
      cmd: c.cmd,
      type: c.type,
      check: c.check,
      name: c.name,
      args: c.args,
    };
  });
}

export class RunStateManager {
  private state: RunState;
  private statePath: string;
  private projectDir?: string;
  private playbookName?: string;

  /**
   * Build the initial RunState from a TaskDag.
   *
   * Each DagNode contributes full task context (inputs, outputs, checks, agent,
   * skill, tags, vars) because TaskDefinition carries it from playbook + TASK.md
   * parsing.  Dynamically spawned nodes added later via addSpawnedChildNode.
   */
  constructor(
    executionDir: string,
    dagOrManifest: TaskDag | Manifest,
    playbookHash?: string,
    projectDir?: string,
  ) {
    this.statePath = join(executionDir, "runstate.json");
    this.projectDir = projectDir;
    this.playbookName = (dagOrManifest as any)?.playbookName
      ?? (isManifest(dagOrManifest) ? dagOrManifest.metadata?.playbook : undefined);
    const executionId = executionDir.split("/").pop() ?? "";

    const nodes: Record<string, RunStateNode> = {};
    const edges: Array<{ from: string; to: string }> = [];
    const roots: string[] = [];

    // Accept either a TaskDag (production code path) or a Manifest (used by
    // unit tests and the resume path when only a manifest is available).
    // Normalise to a common iterable shape: {id, taskDef, depends_on,
    // depended_on_by, path, type, convergePassthrough, spawned_children}.
    const dag = isManifest(dagOrManifest)
      ? manifestToDagLike(dagOrManifest)
      : dagOrManifest;

    for (const [id, dagNode] of dag.nodes) {
      const td = dagNode.taskDef;

      for (const dep of dagNode.depends_on) {
        edges.push({ from: dep, to: id });
      }

      const journalPath = projectDir
        ? join(
            executionDir.replace(projectDir + "/", ""),
            "tasks",
            id,
          ) + "/"
        : join("tasks", id) + "/";

      const groupRaw = (td.vars as Record<string, unknown> | undefined)?.group;
      const group = typeof groupRaw === "string" && groupRaw.trim()
        ? groupRaw.trim()
        : undefined;

      nodes[id] = {
        id,
        status: "pending",
        attempts: 0,
        duration_ms: 0,

        depends_on: [...dagNode.depends_on],
        depended_on_by: [...dagNode.depended_on_by],

        title: td.title,
        description: td.description,
        inputs: td.inputs ?? [],
        outputs: td.outputs ?? [],
        checks: normalizeChecks(td.checks),
        tags: td.tags ?? [],
        agent: td.agent,
        skill: td.skill,
        vars: td.vars,
        group,

        journal_path: journalPath,
        source_path: dagNode.path,
        spawned_children: [...(dagNode.spawned_children ?? [])],
        from_seed: td.from_seed,
        seed: null,

        attempts_detail: [],

        dag_type: dagNode.type,
        converge_passthrough: dagNode.convergePassthrough,

        task_def: {
          title: td.title,
          description: td.description,
          inputs: td.inputs ?? [],
          outputs: td.outputs ?? [],
          checks: normalizeChecks(td.checks),
          tags: td.tags ?? [],
          agent: td.agent,
          skill: td.skill,
          vars: td.vars,
          handoff: (td as any).handoff,
          body: (td as any).body ?? (td as any).prompt ?? "",
        },
      };
    }

    for (const root of dag.roots) {
      roots.push(root.id);
    }

    this.state = {
      metadata: {
        execution_id: executionId,
        selector: "",
        playbook: (dag as any).playbookName ?? "",
        status: "running",
        playbook_hash: playbookHash,
        generated_at: new Date().toISOString(),
        converge_version: "0.1.0",
        total_nodes: dag.nodes.size,
      },
      dag: { nodes, edges, roots },
    };

    this.tryLoadExisting();
  }

  /* ── Persistence ─────────────────────────────────────────────────── */

  async persist(): Promise<void> {
    // Persisted shape mirrors getStateSnapshot(): include a flat `results`
    // array alongside the canonical `dag.nodes` record so post-mortem
    // tooling and tests can iterate either form.
    const wire = {
      ...this.state,
      results: Object.values(this.state.dag.nodes),
    };
    await atomicWriteFile(this.statePath, JSON.stringify(wire, null, 2));
  }

  /**
   * Load existing runstate.json from disk.  Merge completed node statuses,
   * attempt detail, and spawned children into the fresh DAG skeleton so
   * resume picks up where it left off.
   */
  private tryLoadExisting(): void {
    try {
      if (!existsSync(this.statePath)) {
        // RFC 0024: when runstate.json is absent (typical on a peer
        // machine that just cloned the repo — .converge/journal/ is
        // gitignored), fall back to the inventory ledger. Rows marked
        // status: "done" with a fingerprint hydrate this run's DAG to
        // "pass" so the existing cache check in run/index.ts can decide
        // whether to skip each task.
        this.hydrateFromInventory();
        return;
      }
      const raw = readFileSync(this.statePath, "utf-8");
      const existing: RunState = JSON.parse(raw);
      if (!existing?.dag?.nodes) return;

      const existingNodes = existing.dag.nodes;

      for (const node of Object.values(this.state.dag.nodes)) {
        const prev = existingNodes[node.id];
        if (!prev) continue;

        // A prior process may have been killed while a task was running. Treat
        // stale running state as pending so resume can retry it deterministically.
        node.status = prev.status === "running" ? "pending" : prev.status;
        node.attempts = prev.attempts;
        node.duration_ms = prev.duration_ms;
        if (prev.started_at) node.started_at = prev.started_at;
        if (prev.completed_at) node.completed_at = prev.completed_at;
        if (prev.error_message) node.error_message = prev.error_message;
        if (prev.status !== "running") {
          if (prev.worker_id) node.worker_id = prev.worker_id;
          if (prev.lease_id) node.lease_id = prev.lease_id;
          if (prev.lease_started_at) node.lease_started_at = prev.lease_started_at;
          if (prev.heartbeat_at) node.heartbeat_at = prev.heartbeat_at;
        }
        if (prev.output_hashes) node.output_hashes = prev.output_hashes;
        if (prev.attempts_detail) node.attempts_detail = prev.attempts_detail;
        if (prev.spawned_children) node.spawned_children = prev.spawned_children;
        if (prev.depended_on_by) node.depended_on_by = prev.depended_on_by;

        // Carry forward task context that may have been enriched at runtime
        if (prev.title) node.title = prev.title;
        if (prev.description) node.description = prev.description;
        if (prev.agent) node.agent = prev.agent;
        if (prev.skill) node.skill = prev.skill;
        if (prev.from_seed) node.from_seed = prev.from_seed;
      }

      // Preserve nodes that exist on disk but not in the current DAG
      // (e.g. dynamically spawned children from a prior run that still exist).
      // Normalize stale running state to pending for resumability.
      //
      // Skip nodes whose container was split into diverge/converge by the
      // current DAG build — otherwise the pre-split originals get re-added
      // alongside their replacements, causing duplicate execution.
      for (const [id, prevNode] of Object.entries(existingNodes)) {
        if (!this.state.dag.nodes[id]) {
          const wasSplit =
            this.state.dag.nodes[`${id}-diverge`] != null ||
            this.state.dag.nodes[`${id}-converge`] != null;
          if (wasSplit) continue;
          this.state.dag.nodes[id] = {
            ...prevNode,
            status: prevNode.status === "running" ? "pending" : prevNode.status,
            worker_id: prevNode.status === "running" ? undefined : prevNode.worker_id,
            lease_id: prevNode.status === "running" ? undefined : prevNode.lease_id,
            lease_started_at:
              prevNode.status === "running" ? undefined : prevNode.lease_started_at,
            heartbeat_at: prevNode.status === "running" ? undefined : prevNode.heartbeat_at,
            attempts_detail: prevNode.attempts_detail ?? [],
          };
        }
      }

      // Restore edges and roots from the persisted state (they may include
      // edges to/from spawned children not in the fresh DAG)
      if (existing.dag.edges) this.state.dag.edges = existing.dag.edges;
      if (existing.dag.roots) this.state.dag.roots = existing.dag.roots;

      // Metadata carry-forward
      if (existing.metadata) {
        this.state.metadata.execution_id =
          existing.metadata.execution_id || this.state.metadata.execution_id;
        this.state.metadata.status =
          existing.metadata.status || this.state.metadata.status;
        this.state.metadata.selector =
          existing.metadata.selector || "";
        this.state.metadata.playbook_hash =
          existing.metadata.playbook_hash || this.state.metadata.playbook_hash;
        this.state.metadata.completed_at = existing.metadata.completed_at;
        this.state.metadata.total_nodes = Object.keys(this.state.dag.nodes).length;
      }
    } catch (err) {
      // The on-disk runstate.json is corrupt or unreadable. Without
      // this preservation, the prior `catch {}` would silently reset
      // all progress — every completed task on the previous run becomes
      // "pending" again. That's the worst kind of silent regression for
      // long-running playbooks.
      //
      // Preserve the corrupt file as `runstate.json.corrupt` for
      // forensics (the operator can recover task statuses by hand), log
      // the parse error to stderr, and emit the same noisy warning we
      // emit for malformed TASK.md files so it's visible.
      try {
        const corruptPath = `${this.statePath}.corrupt`;
        if (existsSync(this.statePath)) {
          const raw = readFileSync(this.statePath, "utf-8");
          // Use sync atomic write — we're in a sync constructor path.
          // Best-effort: if the write fails we still want to continue
          // with a fresh state rather than crash the whole runner.
          const { writeFileSync: wfs } = require("node:fs");
          wfs(corruptPath, raw, "utf-8");
        }
      } catch {
        // ignore — diagnostic preservation is best-effort
      }
      console.error(
        `converge: WARNING — runstate.json was unreadable (${
          (err as Error)?.message ?? err
        }).\n` +
          `  Preserved corrupt file at ${this.statePath}.corrupt for inspection.\n` +
          `  Resume will start from a fresh state — completed tasks may re-run.`,
      );
    }
  }

  /* ── Accessors ───────────────────────────────────────────────────── */

  get executionDir(): string {
    return this.statePath.replace(/[\\/]runstate\.json$/, "");
  }

  get statePath_(): string {
    return this.statePath;
  }

  /** Single source of truth: relative journal path (e.g. "tasks/01-compute/"). */
  getNodeJournalPath(nodeId: string): string | undefined {
    return this.state.dag.nodes[nodeId]?.journal_path;
  }

  /** Single source of truth: absolute journal directory on disk. */
  getNodeJournalDir(projectDir: string, nodeId: string): string | undefined {
    const rel = this.getNodeJournalPath(nodeId);
    if (!rel) return undefined;
    return join(projectDir, rel);
  }

  private getNode(nodeId: string): RunStateNode {
    const node = this.state.dag.nodes[nodeId];
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }

  /* ── Mutations ───────────────────────────────────────────────────── */

  async markRunning(
    nodeId: string,
    lease?: {
      workerId?: string;
      leaseId?: string;
      heartbeatAt?: string;
    },
  ): Promise<number> {
    const node = this.getNode(nodeId);
    node.attempts += 1;
    node.status = "running";
    node.started_at = new Date().toISOString();
    node.worker_id = lease?.workerId;
    node.lease_id = lease?.leaseId;
    node.lease_started_at = node.started_at;
    node.heartbeat_at = lease?.heartbeatAt ?? node.started_at;
    await this.persist();
    this.publishInventoryStatus(nodeId, "doing");
    return node.attempts;
  }

  async markSeeded(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "seeded";
    await this.persist();
    this.publishInventoryStatus(nodeId, "doing");
  }

  async markComplete(
    nodeId: string,
    durationMs: number,
    completionData?: CompletionData,
  ): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pass";
    node.duration_ms = durationMs;
    node.completed_at = new Date().toISOString();

    this.applyCompletionData(node, completionData);

    node.attempts_detail = [
      ...(node.attempts_detail ?? []),
      {
        attempt: node.attempts,
        started_at: node.started_at ?? new Date().toISOString(),
        completed_at: node.completed_at,
        duration_ms: durationMs,
        status: "pass",
        check_results: completionData?.check_results,
        output_hashes: completionData?.output_hashes,
      } satisfies AttemptDetail,
    ];

    await this.persist();
    this.publishInventoryStatus(nodeId, "done");
  }

  async markFailed(
    nodeId: string,
    error: string,
    durationMs: number,
    completionData?: CompletionData,
  ): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "error";
    node.error_message = error;
    node.duration_ms = durationMs;
    node.completed_at = new Date().toISOString();

    this.applyCompletionData(node, completionData);

    node.attempts_detail = [
      ...(node.attempts_detail ?? []),
      {
        attempt: node.attempts,
        started_at: node.started_at ?? new Date().toISOString(),
        completed_at: node.completed_at,
        duration_ms: durationMs,
        status: "error",
        error_message: error,
        check_results: completionData?.check_results,
        output_hashes: completionData?.output_hashes,
      } satisfies AttemptDetail,
    ];

    await this.persist();
    this.publishInventoryStatus(nodeId, "blocked");
  }

  async markBlocked(
    nodeId: string,
    reason: string,
    durationMs: number,
    completionData?: CompletionData,
  ): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "blocked";
    node.error_message = reason;
    node.duration_ms = durationMs;
    node.completed_at = new Date().toISOString();

    this.applyCompletionData(node, completionData);

    node.attempts_detail = [
      ...(node.attempts_detail ?? []),
      {
        attempt: node.attempts,
        started_at: node.started_at ?? new Date().toISOString(),
        completed_at: node.completed_at,
        duration_ms: durationMs,
        status: "blocked",
        error_message: reason,
        check_results: completionData?.check_results,
        output_hashes: completionData?.output_hashes,
      } satisfies AttemptDetail,
    ];

    await this.persist();
    this.publishInventoryStatus(nodeId, "blocked");
  }

  async markSkipped(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "skipped";
    await this.persist();
    this.publishInventoryStatus(nodeId, "dropped");
  }

  async markPending(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pending";
    node.duration_ms = 0;
    node.error_message = undefined;
    node.completed_at = undefined;
    node.worker_id = undefined;
    node.lease_id = undefined;
    node.lease_started_at = undefined;
    node.heartbeat_at = undefined;
    await this.persist();
    this.publishInventoryStatus(nodeId, "todo");
  }

  /** Persist a content fingerprint for change detection. */
  setNodeFingerprint(nodeId: string, fingerprint: string): void {
    const node = this.getNode(nodeId);
    node.fingerprint = fingerprint;
  }

  /**
   * RFC 0024: when runstate.json was absent and the manager hydrated
   * from the inventory ledger, expose that hydrated state as a
   * "previous run" snapshot so the existing change-detection loop in
   * run/index.ts can reconcile it against the current TASK.md
   * fingerprints and on-disk outputs without code duplication.
   *
   * Returns null when no hydration happened (i.e. runstate.json was
   * present, or the inventory had nothing to hydrate from).
   */
  hasInventoryHydratedPriorState(): boolean {
    if (existsSync(this.statePath)) return false;
    for (const node of Object.values(this.state.dag.nodes)) {
      if (node.status === "pass" && node.fingerprint) return true;
    }
    return false;
  }

  /**
   * Snapshot of currently-hydrated prior-pass state for the change-
   * detection loop. Same shape as loadPrevRunState() so callers can
   * use either source interchangeably.
   */
  inventoryHydratedAsPrevState(): RunState {
    return JSON.parse(JSON.stringify(this.state)) as RunState;
  }

  /** Mark a node as cached from prior state (fingerprint match, no upstream changes). */
  async markCached(nodeId: string, fingerprint: string, priorNode: RunStateNode): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pass";
    node.fingerprint = fingerprint;
    node.duration_ms = priorNode.duration_ms;
    node.output_hashes = priorNode.output_hashes;
    node.completed_at = new Date().toISOString();
    node.attempts_detail = priorNode.attempts_detail ?? [];
    await this.persist();
    this.publishInventoryStatus(nodeId, "done");
  }

  /**
   * RFC 0024: mirror every runtime status transition into the inventory
   * ledger so the inventory is a true layer between the playbook
   * (factory) and the journal (context). Mapping:
   *
   *   pending → "todo"
   *   running → "doing"
   *   seeded  → "doing"   (spawn-in-flight is still mid-work)
   *   pass    → "done"    (+ fingerprint and completedAt)
   *   error   → "blocked" (operator must fix or retry)
   *   skipped → "dropped"
   *
   * The journal remains the source of truth for attempts/logs/leases;
   * the inventory carries only identity + current status + fingerprint.
   * Together they let a peer machine reconstruct the journal context
   * from the inventory alone.
   *
   * Best-effort: a failure to write the inventory must not crash the
   * runner — the journal is already durable. Silent skip when
   * projectDir or playbookName is unknown (test paths constructing
   * RunStateManager standalone).
   */
  private publishInventoryStatus(
    nodeId: string,
    status: "todo" | "doing" | "done" | "blocked" | "dropped",
  ): void {
    if (!this.projectDir || !this.playbookName) return;
    const node = this.state.dag.nodes[nodeId];
    if (!node) return;
    // Pass the status through verbatim. Earlier versions demoted
    // "done" → "doing" when node.fingerprint was missing, on the
    // theory that a fingerprint-less done row can't be cross-machine
    // resumed. In practice spawned children's fingerprints are set
    // at apply-time (renderedHash in metadata), not via
    // setNodeFingerprint, so the demotion was wrong — markComplete
    // would fire correctly but the row would stick at "doing"
    // forever. The cross-machine resume hydrate at runtime-ledger
    // already skips rows without a fingerprint (see hydrateFromInventory)
    // so a degraded done-without-fingerprint row is harmless: it
    // can't be hydrated by peers, but it doesn't lie about being done
    // on this machine.
    const safeStatus: "todo" | "doing" | "done" | "blocked" | "dropped" = status;
    // Don't downgrade a prior `done` row whose fingerprint still matches
    // the current in-memory node. Inventory is the durable cross-machine
    // signal; transient transitions during a re-run (markRunning →
    // "doing", upstream reset → "todo", selector skip → "dropped") must
    // not erase prior pass evidence. Only an explicit terminal transition
    // (markComplete/markCached → "done", markFailed → "blocked") is
    // allowed to overwrite a done row.
    //
    // The fingerprint match check is critical: if the TASK.md changed,
    // the prior done row is stale and SHOULD be overwritten on the next
    // run-cycle transition. We only protect rows that are still valid.
    if (safeStatus !== "done" && safeStatus !== "blocked") {
      try {
        const prior = readRuntimeLedgerState(this.projectDir, this.playbookName)
          .tasks.find((t) => t.id === nodeId);
        if (
          prior?.status === "done" &&
          prior.fingerprint &&
          node.fingerprint &&
          prior.fingerprint === node.fingerprint
        ) {
          return;
        }
      } catch {
        // Best-effort guard; if the inventory can't be read, fall through
        // and write — the inventory is already in a degraded state and
        // overwriting it doesn't make things worse.
      }
    }
    try {
      // The inventory row's identity (id, taskPath, source, template,
      // renderedHash, etc.) was set when the row was first authored —
      // either by applyManifest (spawned) or by the static-DAG sync
      // (static). The status publisher only ever mutates `status`,
      // `fingerprint`, `completedAt`, and `outputs`/`checks` (which
      // can change between attempts as the task definition evolves).
      //
      // appendTaskStatus updates status + metadata only and skips
      // identity fields. We use it directly when the row already
      // exists so we don't blow away source/template/renderedHash on
      // every state transition. If the row doesn't exist yet (defensive:
      // the runner started a node we don't have an inventory row for),
      // fall through to appendTaskUpsert so it gets created.
      const ledger = readRuntimeLedgerState(this.projectDir, this.playbookName);
      const exists = ledger.tasks.some((t) => t.id === nodeId);
      if (exists) {
        // Use appendTaskUpsert with no `source:` so the existing
        // source survives the merge (apply-time `prev.source` wins
        // through the `task.source ?? prev.source ?? "spawned"`
        // ladder in runtime-ledger.ts).
        appendTaskUpsert(this.projectDir, this.playbookName, {
          id: nodeId,
          goalId: "inventory",
          summary: node.title ?? node.description ?? nodeId,
          title: node.title,
          status: safeStatus,
          playbook: this.playbookName,
          outputs: node.outputs,
          checks: node.checks?.map((c) => ({
            id: c.id,
            cmd: c.cmd ?? "",
          })),
          fingerprint: node.fingerprint,
          completedAt:
            safeStatus === "done"
              ? node.completed_at ?? new Date().toISOString()
              : undefined,
        });
      } else {
        // First time we've seen this id — create the row with
        // source: "static" (we got called from RunStateManager, which
        // only knows about the static DAG; spawned children are
        // upserted by applyManifest before they hit this path).
        appendTaskUpsert(this.projectDir, this.playbookName, {
          id: nodeId,
          taskPath: node.source_path,
          goalId: "inventory",
          summary: node.title ?? node.description ?? nodeId,
          title: node.title,
          status: safeStatus,
          source: "static",
          playbook: this.playbookName,
          outputs: node.outputs,
          checks: node.checks?.map((c) => ({
            id: c.id,
            cmd: c.cmd ?? "",
          })),
          fingerprint: node.fingerprint,
          completedAt:
            safeStatus === "done"
              ? node.completed_at ?? new Date().toISOString()
              : undefined,
        });
      }
    } catch (err) {
      console.error(
        `[runstate] failed to publish inventory row for ${nodeId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * RFC 0024: when runstate.json is absent, hydrate prior-pass state from
   * the inventory ledger. Rows with status === "done" and a fingerprint
   * are projected onto the in-memory DAG as { status: "pass", fingerprint,
   * completed_at }. The existing change-detection loop in run/index.ts
   * then reconciles each hydrated node against the current TASK.md
   * fingerprint and on-disk outputs — same algorithm as the local-resume
   * path, fed from a portable source.
   */
  private hydrateFromInventory(): void {
    if (!this.projectDir || !this.playbookName) return;
    const ledgerPath = runtimeTasksPath(this.projectDir, this.playbookName);
    if (!existsSync(ledgerPath)) return;
    let state;
    try {
      state = readRuntimeLedgerState(this.projectDir, this.playbookName);
    } catch {
      // Corrupt ledger — fall through to a clean run. parseJsonl
      // already skips malformed lines, so this catch covers only
      // catastrophic FS faults.
      return;
    }
    for (const row of state.tasks) {
      if (row.status !== "done" || !row.fingerprint) continue;
      const node = this.state.dag.nodes[row.id];
      if (!node) continue;
      // Hydrate as pass. The change-detection loop in run/index.ts
      // reconciles each hydrated node against the on-disk outputs and
      // current TASK.md fingerprint — a missing output on a fresh
      // machine forces a re-run, so we don't need to second-guess here.
      node.status = "pass";
      node.fingerprint = row.fingerprint;
      if (row.completedAt) node.completed_at = row.completedAt;
    }
  }

  /**
   * Load a prior runstate.json from an execution directory.
   * Returns null if the file doesn't exist or can't be parsed.
   *
   * Corruption-resilience: a corrupt runstate.json (truncated write,
   * disk fault, manual edit) is treated the same as a missing file —
   * the caller will rebuild state from scratch. We surface a warning
   * so the operator sees the downgrade rather than silently losing
   * resume capability.
   */
  static loadPriorRunState(executionDir: string): RunState | null {
    const p = join(executionDir, "runstate.json");
    if (!existsSync(p)) return null;
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as RunState;
    } catch (parseErr) {
      const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.warn(
        `[runstate] corrupt runstate.json at ${p} (${m}). ` +
          `Treating as absent; resume will rebuild from scratch.`,
      );
      return null;
    }
  }

  /**
   * Load the previous run's state from runstate.prev.json (single-target model).
   * The previous runstate is rotated to .prev.json at the start of each run.
   */
  loadPrevRunState(): RunState | null {
    const prevPath = join(this.executionDir, "runstate.prev.json");
    if (!existsSync(prevPath)) return null;
    try {
      return JSON.parse(readFileSync(prevPath, "utf-8")) as RunState;
    } catch (parseErr) {
      const m = parseErr instanceof Error ? parseErr.message : String(parseErr);
      console.warn(
        `[runstate] corrupt runstate.prev.json at ${prevPath} (${m}). ` +
          `Treating as absent.`,
      );
      return null;
    }
  }

  async incrementAttempt(nodeId: string): Promise<number> {
    const node = this.getNode(nodeId);
    node.attempts += 1;
    await this.persist();
    return node.attempts;
  }

  private applyCompletionData(
    node: RunStateNode,
    data?: CompletionData,
  ): void {
    if (!data) return;
    if (data.title) node.title = data.title;
    if (data.description) node.description = data.description;
    if (data.agent) node.agent = data.agent;
    if (data.skill) node.skill = data.skill;
    if (data.from_seed) node.from_seed = data.from_seed;
    if (data.output_hashes) {
      node.output_hashes = {
        ...(node.output_hashes ?? {}),
        ...data.output_hashes,
      };
    }
  }

  /* ── Dynamic spawn ───────────────────────────────────────────────── */

  /** Register a dynamically spawned child as a full DAG node. */
  async addSpawnedChildNode(
    childId: string,
    parentId: string,
    dependsOn: string[],
    taskContext?: {
      title?: string;
      description?: string;
      agent?: string;
      skill?: string | string[];
      inputs?: string[];
      outputs?: string[];
      checks?: RunStateCheck[];
      tags?: string[];
      vars?: Record<string, unknown>;
      convergePassthrough?: boolean;
      passthrough?: boolean;
      sourcePath?: string;
    },
  ): Promise<void> {
    const parent = this.getNode(parentId);
    const sourceJournalPath = taskContext?.sourcePath
      ? relative(
          this.projectDir ?? process.cwd(),
          dirname(taskContext.sourcePath),
        ).replace(/\\/g, "/") + "/"
      : undefined;

    const existing = this.state.dag.nodes[childId];
    if (existing) {
      existing.depends_on = [...dependsOn];
      existing.title = taskContext?.title ?? existing.title;
      existing.description = taskContext?.description ?? existing.description;
      existing.inputs = taskContext?.inputs ?? existing.inputs;
      existing.outputs = taskContext?.outputs ?? existing.outputs;
      existing.checks = taskContext?.checks ?? existing.checks;
      existing.tags = taskContext?.tags ?? existing.tags;
      existing.agent = taskContext?.agent ?? existing.agent;
      existing.skill = taskContext?.skill ?? existing.skill;
      existing.vars = taskContext?.vars ?? existing.vars;
      existing.passthrough = taskContext?.passthrough ?? existing.passthrough;
      existing.source_path = taskContext?.sourcePath ?? existing.source_path;
      existing.journal_path = sourceJournalPath ?? existing.journal_path;
      existing.from_seed = parentId;
      for (const dep of dependsOn) {
        const depNode = this.state.dag.nodes[dep];
        if (depNode && !depNode.depended_on_by.includes(childId)) {
          depNode.depended_on_by.push(childId);
        }
      }
      if (!parent.depended_on_by.includes(childId)) {
        parent.depended_on_by.push(childId);
      }
      if (!parent.spawned_children.includes(childId)) {
        parent.spawned_children.push(childId);
      }
      await this.persist();
      return;
    }

    this.state.dag.nodes[childId] = {
      id: childId,
      status: "pending",
      attempts: 0,
      duration_ms: 0,

      depends_on: [...dependsOn],
      depended_on_by: [],

      title: taskContext?.title,
      description: taskContext?.description,
      inputs: taskContext?.inputs ?? [],
      outputs: taskContext?.outputs ?? [],
      checks: taskContext?.checks ?? [],
      tags: taskContext?.tags ?? [],
      agent: taskContext?.agent,
      skill: taskContext?.skill,
      vars: taskContext?.vars,
      passthrough: taskContext?.passthrough,

      journal_path: sourceJournalPath ?? `${parent.journal_path}spawned/${childId}/`,
      source_path: taskContext?.sourcePath,
      spawned_children: [],
      from_seed: parentId,

      attempts_detail: [],
    };

    // Wire edges
    for (const dep of dependsOn) {
      this.state.dag.edges.push({ from: dep, to: childId });
      const depNode = this.state.dag.nodes[dep];
      if (depNode && !depNode.depended_on_by.includes(childId)) {
        depNode.depended_on_by.push(childId);
      }
    }

    if (!parent.depended_on_by.includes(childId)) {
      parent.depended_on_by.push(childId);
    }
    if (!parent.spawned_children.includes(childId)) {
      parent.spawned_children.push(childId);
    }

    this.state.metadata.total_nodes = Object.keys(this.state.dag.nodes).length;

    await this.persist();
  }

  /** Append to a parent's spawned_children list without adding a new node. */
  async addSpawnedChildren(
    parentId: string,
    childIds: string[],
  ): Promise<void> {
    const node = this.getNode(parentId);
    node.spawned_children = [
      ...new Set([...node.spawned_children, ...childIds]),
    ];
    await this.persist();
  }

  /* ── Run-level mutations ────────────────────────────────────────── */

  async setRunStatus(status: "running" | "complete" | "error"): Promise<void> {
    this.state.metadata.status = status;
    this.state.metadata.completed_at = new Date().toISOString();
    await this.persist();
  }

  /* ── Queries ─────────────────────────────────────────────────────── */

  async getNodeStatus(
    nodeId: string,
  ): Promise<RunStateNode | undefined> {
    return this.state.dag.nodes[nodeId];
  }

  async isComplete(nodeId: string): Promise<boolean> {
    return this.state.dag.nodes[nodeId]?.status === "pass";
  }

  async isFailed(nodeId: string): Promise<boolean> {
    return this.state.dag.nodes[nodeId]?.status === "error";
  }

  async isLocked(nodeId: string): Promise<boolean> {
    const status = this.state.dag.nodes[nodeId]?.status;
    return status === "pass" || status === "error" || status === "blocked" || status === "skipped";
  }

  async getAttemptCount(nodeId: string): Promise<number> {
    return this.state.dag.nodes[nodeId]?.attempts ?? 0;
  }

  async getCompletedCount(): Promise<number> {
    return Object.values(this.state.dag.nodes).filter(
      (r) => r.status === "pass",
    ).length;
  }

  async getFailedCount(): Promise<number> {
    return Object.values(this.state.dag.nodes).filter(
      (r) => r.status === "error",
    ).length;
  }

  async getStateSnapshot(): Promise<RunState & { results: RunStateNode[] }> {
    // Deep-clone the canonical state, then surface a flat `results` array
    // derived from `dag.nodes`. Test fixtures and consumers that prefer
    // array iteration over record key-iteration use this view.
    const cloned = JSON.parse(JSON.stringify(this.state)) as RunState;
    const results = Object.values(cloned.dag.nodes);
    return { ...cloned, results };
  }

  getStatusMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const [id, node] of Object.entries(this.state.dag.nodes)) {
      map.set(id, node.status);
    }
    return map;
  }

  getCompletedTaskIds(): string[] {
    return Object.values(this.state.dag.nodes)
      .filter((r) => r.status === "pass")
      .map((r) => r.id);
  }

  getFailedTaskIds(): string[] {
    return Object.values(this.state.dag.nodes)
      .filter((r) => r.status === "error")
      .map((r) => r.id);
  }

  getSkippedTaskIds(): string[] {
    return Object.values(this.state.dag.nodes)
      .filter((r) => r.status === "skipped")
      .map((r) => r.id);
  }

  getLockedTaskIds(): string[] {
    return Object.values(this.state.dag.nodes)
      .filter(
        (r) =>
          r.status === "pass" ||
          r.status === "error" ||
          r.status === "blocked" ||
          r.status === "skipped",
      )
      .map((r) => r.id);
  }

  hasNode(nodeId: string): boolean {
    return nodeId in this.state.dag.nodes;
  }

  /* ── Manifest bridge (backward compat) ───────────────────────────── */

  /**
   * Build a RunStateManager from a legacy Manifest (used by reconcile /
   * validate commands that work with tree-based task discovery, not the
   * DAG-based runner).  Nodes get topology from the manifest but minimal
   * task context — these callers only query completion state.
   */
  static fromManifest(
    executionDir: string,
    manifest: Manifest,
  ): RunStateManager {
    const dag = new TaskDag();
    for (const [id, mNode] of Object.entries(manifest.nodes)) {
      dag.nodes.set(id, {
        id,
        type: "normal",
        parents: [...(manifest.parent_map[id] ?? [])],
        children: [...(manifest.child_map[id] ?? [])],
        depends_on: [...(mNode.depends_on ?? [])],
        depended_on_by: [...(mNode.depended_on_by ?? [])],
        taskDef: { id },
        path: (mNode as any).path ?? "",
        status: "pending",
        virtual: false,
      });
    }
    dag.playbookName = manifest.metadata.playbook;
    // Compute roots (nodes with no parents)
    for (const node of dag.nodes.values()) {
      if (node.parents.length === 0) dag.roots.push(node);
    }
    return new RunStateManager(executionDir, dag);
  }

  /** Build a Manifest from the current runstate for tools that need it. */
  toManifest(): Manifest {
    const nodes: Record<string, any> = {};
    const child_map: Record<string, string[]> = {};
    const parent_map: Record<string, string[]> = {};

    for (const [id, node] of Object.entries(this.state.dag.nodes)) {
      nodes[id] = {
        id: node.id,
        depends_on: [...node.depends_on],
        depended_on_by: [...node.depended_on_by],
        tags: node.tags,
        checks: node.checks.map((c) => c.id),
        inputs: node.inputs,
        outputs: node.outputs,
        frontmatter_hash: "",
        body_hash: "",
        checks_hash: "",
        inputs_hash: "",
        upstream_hash: "",
        state: "concrete",
        path: node.source_path ?? "",
        seed: node.seed ?? null,
      };
      child_map[id] = [...node.spawned_children];
      parent_map[id] = node.from_seed ? [node.from_seed] : [];
    }

    return {
      metadata: {
        playbook: this.state.metadata.playbook,
        playbook_hash: this.state.metadata.playbook_hash,
        generated_at: this.state.metadata.generated_at,
        converge_version: this.state.metadata.converge_version,
        frontier_count: 0,
      },
      nodes,
      child_map,
      parent_map,
    };
  }
}

export async function writeJournalManifest(
  executionDir: string,
  manifest: Manifest,
): Promise<void> {
  const path = join(executionDir, "manifest.json");
  await atomicWriteFile(path, JSON.stringify(manifest, null, 2));
}
