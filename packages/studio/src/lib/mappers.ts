import type {
  TaskNode,
  TaskStatus,
  TaskMode,
  CheckResult,
  AttemptDetail,
  PlaybookGoal,
  GoalStatus,
  RunState,
  Gap,
  GapSeverity,
  GapLevel,
  GapType,
  JournalEvent,
} from "../types";
import type {
  PlaybookData,
  PlaybookTask,
  PlaybookCheck,
  TaskGroup,
  ChatMsg,
} from "../playbook-data";

/* ------------------------------------------------------------------ */
/*  Core types (inline — avoids importing from @openplaybooks/*)       */
/* ------------------------------------------------------------------ */

interface CoreCheckResultItem {
  id: string;
  description?: string;
  cmd?: string;
  passed: boolean;
  exit_code?: number;
  output?: string;
}

interface CoreAttemptDetail {
  attempt: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_ms: number;
  error_message?: string;
  check_results?: CoreCheckResultItem[];
}

interface CoreRunStateCheck {
  id: string;
  description?: string;
  cmd?: string;
  name?: string;
}

interface CoreRunStateNode {
  id: string;
  status: string;
  attempts: number;
  duration_ms: number;
  depends_on: string[];
  depended_on_by: string[];
  title?: string;
  description?: string;
  tags?: string[];
  agent?: string;
  skill?: string | string[];
  source_path?: string;
  inputs: string[];
  outputs: string[];
  checks: CoreRunStateCheck[];
  spawned_children: string[];
  attempts_detail: CoreAttemptDetail[];
  dag_type?: string;
  group?: string;
  vars?: Record<string, unknown>;
  handoff?: {
    artifact: string;
    format?: "md" | "html";
    generate?: string;
    skill?: string;
  };
  task_def?: {
    body?: string;
    description?: string;
    tags?: string[];
    agent?: string;
    skill?: string | string[];
    vars?: Record<string, unknown>;
    handoff?: {
      artifact: string;
      format?: "md" | "html";
      generate?: string;
      skill?: string;
    };
  } & Record<string, unknown>;
}

interface CoreRunState {
  metadata: {
    execution_id: string;
    playbook: string;
    status: string;
    generated_at: string;
    completed_at?: string;
    total_nodes: number;
  };
  dag: {
    nodes: Record<string, CoreRunStateNode>;
    edges: Array<{ from: string; to: string }>;
    roots: string[];
  };
}

interface CoreRuntimeGoal {
  id: string;
  description: string;
  checks?: any[];
  status_runtime: string;
}

/* ------------------------------------------------------------------ */
/*  RunStateNode → TaskNode                                            */
/* ------------------------------------------------------------------ */

function mapDagTypeToMode(dagType?: string): TaskMode {
  switch (dagType) {
    case "diverge":
      return "spawner";
    case "converge":
      return "converger";
    case "hook":
      return "gateway";
    default:
      return "task";
  }
}

function mapCheckResults(items?: CoreCheckResultItem[]): CheckResult[] {
  if (!items) return [];
  return items.map((c) => ({
    id: c.id,
    label: c.description || c.id,
    passed: c.passed,
    output: c.output,
  }));
}

function mapAttempt(a: CoreAttemptDetail): AttemptDetail {
  return {
    attempt: a.attempt,
    status: a.status as TaskStatus,
    durationMs: a.duration_ms,
    checkResults: a.check_results
      ? mapCheckResults(a.check_results)
      : undefined,
    error: a.error_message,
  };
}

export function mapRunStateNode(node: CoreRunStateNode): TaskNode {
  const lastAttempt = node.attempts_detail?.[node.attempts_detail.length - 1];
  const humanReviewHold =
    node.status === "blocked" &&
    typeof lastAttempt?.error_message === "string" &&
    /awaiting human review/i.test(lastAttempt.error_message);
  const checkResults = lastAttempt?.check_results
    ? mapCheckResults(lastAttempt.check_results)
    : node.checks.map((c) => ({
        id: c.id,
        label: c.description || c.name || c.id,
        passed: false,
      }));

  const pickGroup = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  const groupFromVars =
    pickGroup(node.vars?.group) ?? pickGroup(node.task_def?.vars?.group);

  const td = node.task_def;
  const body = typeof td?.body === "string" ? td.body : undefined;
  const description =
    node.description ??
    (typeof td?.description === "string" ? td.description : undefined);
  const tags =
    node.tags ?? (Array.isArray(td?.tags) ? (td!.tags as string[]) : undefined);
  const agent =
    node.agent ?? (typeof td?.agent === "string" ? td.agent : undefined);
  const skill = node.skill ?? (td?.skill as any);
  const vars = (td?.vars as Record<string, unknown> | undefined) ?? node.vars;
  const handoff = node.handoff ?? td?.handoff;

  return {
    id: node.id,
    title: node.title || node.id,
    status: (humanReviewHold ? "awaiting-review" : node.status) as TaskStatus,
    mode: mapDagTypeToMode(node.dag_type),
    dependsOn: node.depends_on,
    dependedOnBy: node.depended_on_by,
    inputs: node.inputs,
    outputs: node.outputs,
    checks: checkResults,
    attempts: (node.attempts_detail || []).map(mapAttempt),
    spawnedChildren: node.spawned_children,
    dagType: node.dag_type,
    group: pickGroup(node.group) ?? groupFromVars,
    body,
    description,
    tags,
    agent,
    skill,
    handoff,
    sourcePath: node.source_path,
    vars,
  };
}

/* ------------------------------------------------------------------ */
/*  Core RunState → Studio RunState                                    */
/* ------------------------------------------------------------------ */

export function mapRunState(core: CoreRunState): RunState {
  const nodes = Object.values(core.dag.nodes).map(mapRunStateNode);
  return {
    executionId: core.metadata.execution_id,
    playbook: core.metadata.playbook,
    status: core.metadata.status as "running" | "complete" | "error",
    generatedAt: core.metadata.generated_at,
    totalNodes: core.metadata.total_nodes,
    nodes,
  };
}

/* ------------------------------------------------------------------ */
/*  RuntimeGoal → PlaybookGoal                                         */
/* ------------------------------------------------------------------ */

function mapGoalStatus(status: string): GoalStatus {
  switch (status) {
    case "pending":
      return "candidate";
    case "active":
      return "active";
    case "done":
      return "active";
    case "rejected":
      return "rejected";
    case "stalled":
      return "stalled";
    case "blocked":
      return "stalled";
    default:
      return "candidate";
  }
}

export function mapRuntimeGoal(goal: CoreRuntimeGoal): PlaybookGoal {
  return {
    id: goal.id,
    description: goal.description,
    status: mapGoalStatus(goal.status_runtime),
    checks:
      goal.checks?.map((c: any) => (typeof c === "string" ? c : c.id)) ?? [],
  };
}

/* ------------------------------------------------------------------ */
/*  Gap extraction from journal events                                 */
/* ------------------------------------------------------------------ */

export function extractGapsFromEvents(events: JournalEvent[]): Gap[] {
  const gapMap = new Map<string, Gap>();

  for (const ev of events) {
    if (ev.eventType === "GAP_DETECTED" && ev.metadata) {
      const meta = ev.metadata as Record<string, any>;
      const gapId = meta.gapId || meta.gap_id || `gap-${ev.timestamp}`;
      gapMap.set(gapId, {
        id: gapId,
        type: (meta.type || "plan") as GapType,
        level: (ev.level || "task") as GapLevel,
        scope: ev.scope,
        description: ev.message || "",
        detected: ev.timestamp,
        resolved: false,
        severity: (meta.severity || "medium") as GapSeverity,
      });
    }
    if (ev.eventType === "GAP_RESOLVED" && ev.metadata) {
      const meta = ev.metadata as Record<string, any>;
      const gapId = meta.gapId || meta.gap_id;
      if (gapId && gapMap.has(gapId)) {
        gapMap.get(gapId)!.resolved = true;
      }
    }
  }

  return Array.from(gapMap.values());
}

/* ------------------------------------------------------------------ */
/*  Bridge: API data → PlaybookData (workspace component shape)        */
/* ------------------------------------------------------------------ */

function mapTaskStatus(status: string): string {
  switch (status) {
    case "pass":
      return "ok";
    case "running":
      return "live";
    case "error":
      return "fail";
    case "blocked":
      return "delta";
    case "awaiting-review":
      return "awaiting-review";
    case "seeded":
      return "pending";
    default:
      return status;
  }
}

function formatDuration(ms: number): string | null {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function taskNodeToPlaybookTask(
  node: TaskNode,
  allNodes: TaskNode[],
): PlaybookTask {
  const lastAttempt = node.attempts[node.attempts.length - 1];
  const durationMs = lastAttempt?.durationMs ?? 0;
  const isReviewHold = node.status === "awaiting-review";

  const children: PlaybookTask[] = node.spawnedChildren
    .map((childId) => allNodes.find((n) => n.id === childId))
    .filter((n): n is TaskNode => !!n)
    .map((child) => taskNodeToPlaybookTask(child, allNodes));

  return {
    id: node.id,
    title: node.title || node.id,
    mode: node.mode,
    status: mapTaskStatus(node.status),
    duration: node.status === "running" ? "--:--" : formatDuration(durationMs),
    summary: node.title || node.id,
    outputs: node.outputs,
    checks: node.checks.map((c) => ({
      cmd: (c as any).cmd || c.id,
      exit: c.passed ? 0 : node.status === "pending" ? null : 1,
      label: c.label,
      actual: c.output,
    })),
    review: isReviewHold ? { state: "pending" } : null,
    children: children.length > 0 ? children : undefined,
    progress:
      children.length > 0
        ? {
            done: children.filter((c) => mapTaskStatus(c.status) === "ok")
              .length,
            total: children.length,
          }
        : undefined,
    group: node.group,
    dependsOn: node.dependsOn,
    dependedOnBy: node.dependedOnBy,
    inputs: node.inputs,
    dagType: node.dagType,
    attempts: node.attempts?.map((a) => ({
      attempt: a.attempt,
      status: a.status,
      durationMs: a.durationMs,
      error: a.error,
    })),
    body: node.body,
    description: node.description,
    tags: node.tags,
    agent: node.agent,
    skill: node.skill,
    handoff: node.handoff,
    sourcePath: node.sourcePath,
    vars: node.vars,
    spawnedChildren: node.spawnedChildren,
  };
}

function groupTasksByPhase(tasks: PlaybookTask[]): TaskGroup[] {
  const hasGroup = tasks.some((t) => !!t.group);

  if (hasGroup) {
    const order: string[] = [];
    const buckets = new Map<string, PlaybookTask[]>();
    for (const t of tasks) {
      const key = t.group || "__other__";
      if (!buckets.has(key)) {
        buckets.set(key, []);
        order.push(key);
      }
      buckets.get(key)!.push(t);
    }
    return order.map((key) => {
      const groupTasks = buckets.get(key)!;
      const label = key === "__other__" ? "Other" : key;
      return {
        id: `group-${key}`,
        title: label,
        summary: `${groupTasks.length} task${groupTasks.length !== 1 ? "s" : ""}`,
        tasks: groupTasks,
      };
    });
  }

  if (tasks.length === 0) return [];

  return [
    {
      id: "all",
      title: "All tasks",
      summary: `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`,
      tasks,
    },
  ];
}

function journalEventsToChat(events: JournalEvent[]): ChatMsg[] {
  const msgs: ChatMsg[] = [];
  let id = 0;
  for (const ev of events) {
    const ts = ev.timestamp
      ? new Date(ev.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "";
    const type = ev.eventType || (ev as any).type || "";
    const text =
      ev.message || `${type} ${ev.scope || (ev as any).taskId || ""}`.trim();
    if (!text) continue;

    const isComplete =
      type.includes("COMPLETE") ||
      type.includes("PASS") ||
      (type as string) === "task_complete";
    const isFail = type.includes("FAIL") || type.includes("ERROR");
    const isHuman = type.includes("AWAITING") || type.includes("HUMAN");

    msgs.push({
      id: `ev-${++id}`,
      role: isHuman ? "agent" : "tool",
      ts,
      text: (isComplete ? "✓ " : isFail ? "✕ " : "") + text,
      highlight: isHuman,
    });
  }
  return msgs;
}

export interface MapApiToPlaybookDataInput {
  playbookName: string;
  description?: string;
  runState: RunState | null;
  journalEvents: JournalEvent[];
  provider?: string;
}

export function mapApiToPlaybookData(
  input: MapApiToPlaybookDataInput,
): PlaybookData {
  const { playbookName, description, runState, journalEvents, provider } =
    input;

  const allNodes = runState?.nodes ?? [];
  // Filter out synthetic root-diverge / root-converge nodes
  const userNodes = allNodes.filter((n) => !n.id.startsWith("root-"));

  // Convert TaskNode[] → PlaybookTask[] (only top-level, children are nested)
  const spawnedIds = new Set(userNodes.flatMap((n) => n.spawnedChildren));
  const topLevel = userNodes.filter((n) => !spawnedIds.has(n.id));
  const playbookTasks = topLevel.map((n) =>
    taskNodeToPlaybookTask(n, userNodes),
  );

  const groups = groupTasksByPhase(playbookTasks);
  const allTasks = playbookTasks;

  const counts = {
    total: allTasks.length,
    ok: allTasks.filter((t) => t.status === "ok").length,
    live: allTasks.filter((t) => t.status === "live").length,
    delta: allTasks.filter((t) => t.status === "delta").length,
    fail: allTasks.filter((t) => t.status === "fail").length,
    awaiting: allTasks.filter((t) => t.status === "awaiting-review").length,
  };

  const chat = journalEventsToChat(journalEvents);

  const rawStatus = runState?.status;
  const runStatus: PlaybookData["runStatus"] = !runState
    ? "idle"
    : rawStatus === "running"
      ? "running"
      : rawStatus === "complete"
        ? "complete"
        : rawStatus === "error"
          ? "error"
          : "idle";

  return {
    id: playbookName,
    name: playbookName,
    goal: description || playbookName,
    runId:
      runState?.executionId || `run-${new Date().toISOString().slice(0, 19)}`,
    startedAt: runState?.generatedAt
      ? new Date(runState.generatedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "",
    provider: provider || "claude",
    runStatus,
    counts,
    groups,
    chat,
  };
}
