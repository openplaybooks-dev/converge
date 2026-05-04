import { atomicWriteFile } from "../checkpoint/atomic-write.js";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { TaskDag } from "../dag/task-dag.js";
import type { Manifest, RunState, RunStateNode, RunStateCheck, CompletionData, AttemptDetail } from "./types.js";

function hashManifest(manifest: Manifest): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(manifest)).digest("hex")}`;
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

  /**
   * Build the initial RunState from a TaskDag.
   *
   * Each DagNode contributes full task context (inputs, outputs, checks, agent,
   * skill, tags, vars) because TaskDefinition carries it from playbook + TASK.md
   * parsing.  Dynamically spawned nodes added later via addSpawnedChildNode.
   */
  constructor(
    executionDir: string,
    dag: TaskDag,
    playbookHash?: string,
    projectDir?: string,
  ) {
    this.statePath = join(executionDir, "runstate.json");
    const executionId = executionDir.split("/").pop() ?? "";

    const nodes: Record<string, RunStateNode> = {};
    const edges: Array<{ from: string; to: string }> = [];
    const roots: string[] = [];

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

        journal_path: journalPath,
        source_path: dagNode.path,
        spawned_children: [...dagNode.children],
        from_seed: td.from_seed,
        seed: null,

        attempts_detail: [],
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
    await atomicWriteFile(
      this.statePath,
      JSON.stringify(this.state, null, 2),
    );
  }

  /**
   * Load existing runstate.json from disk.  Merge completed node statuses,
   * attempt detail, and spawned children into the fresh DAG skeleton so
   * resume picks up where it left off.
   */
  private tryLoadExisting(): void {
    try {
      if (!existsSync(this.statePath)) return;
      const raw = readFileSync(this.statePath, "utf-8");
      const existing: RunState = JSON.parse(raw);
      if (!existing?.dag?.nodes) return;

      const existingNodes = existing.dag.nodes;

      for (const node of Object.values(this.state.dag.nodes)) {
        const prev = existingNodes[node.id];
        if (!prev) continue;

        node.status = prev.status;
        node.attempts = prev.attempts;
        node.duration_ms = prev.duration_ms;
        if (prev.started_at) node.started_at = prev.started_at;
        if (prev.completed_at) node.completed_at = prev.completed_at;
        if (prev.error_message) node.error_message = prev.error_message;
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
      // (e.g. dynamically spawned children from a prior run that still exist)
      for (const [id, prevNode] of Object.entries(existingNodes)) {
        if (!this.state.dag.nodes[id]) {
          this.state.dag.nodes[id] = prevNode;
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
    } catch {
      // stale or unreadable — keep defaults
    }
  }

  /* ── Accessors ───────────────────────────────────────────────────── */

  get executionDir(): string {
    return this.statePath.replace(/\/runstate\.json$/, "");
  }

  get statePath_(): string {
    return this.statePath;
  }

  private getNode(nodeId: string): RunStateNode {
    const node = this.state.dag.nodes[nodeId];
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }

  /* ── Mutations ───────────────────────────────────────────────────── */

  async markRunning(nodeId: string): Promise<number> {
    const node = this.getNode(nodeId);
    node.attempts += 1;
    node.status = "running";
    node.started_at = new Date().toISOString();
    await this.persist();
    return node.attempts;
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
      ...node.attempts_detail,
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
      ...node.attempts_detail,
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
  }

  async markSkipped(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "skipped";
    await this.persist();
  }

  async markPending(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pending";
    node.duration_ms = 0;
    node.error_message = undefined;
    node.completed_at = undefined;
    await this.persist();
  }

  /** Persist a content fingerprint for change detection. */
  setNodeFingerprint(nodeId: string, fingerprint: string): void {
    const node = this.getNode(nodeId);
    node.fingerprint = fingerprint;
  }

  /** Mark a node as cached from prior state (fingerprint match, no upstream changes). */
  async markCached(nodeId: string, fingerprint: string, priorNode: RunStateNode): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pass";
    node.fingerprint = fingerprint;
    node.duration_ms = priorNode.duration_ms;
    node.output_hashes = priorNode.output_hashes;
    node.completed_at = new Date().toISOString();
    node.attempts_detail = priorNode.attempts_detail;
    await this.persist();
  }

  /**
   * Load a prior runstate.json from an execution directory.
   * Returns null if the file doesn't exist or can't be parsed.
   */
  static loadPriorRunState(executionDir: string): RunState | null {
    try {
      const p = join(executionDir, "runstate.json");
      if (!existsSync(p)) return null;
      return JSON.parse(readFileSync(p, "utf-8")) as RunState;
    } catch {
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
    },
  ): Promise<void> {
    if (this.state.dag.nodes[childId]) return;

    const parent = this.getNode(parentId);

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

      journal_path: parent.journal_path.replace(
        /[^/]+\/$/,
        `${childId}/`,
      ),
      source_path: undefined,
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
    return status === "pass" || status === "error" || status === "skipped";
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

  async getStateSnapshot(): Promise<RunState> {
    return JSON.parse(JSON.stringify(this.state));
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

  getLockedTaskIds(): string[] {
    return Object.values(this.state.dag.nodes)
      .filter(
        (r) =>
          r.status === "pass" ||
          r.status === "error" ||
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
