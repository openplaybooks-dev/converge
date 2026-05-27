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
} from '../types';

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
  inputs: string[];
  outputs: string[];
  checks: CoreRunStateCheck[];
  spawned_children: string[];
  attempts_detail: CoreAttemptDetail[];
  dag_type?: string;
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
    case 'diverge': return 'spawner';
    case 'converge': return 'converger';
    case 'hook': return 'gateway';
    default: return 'leaf';
  }
}

function mapCheckResults(items?: CoreCheckResultItem[]): CheckResult[] {
  if (!items) return [];
  return items.map(c => ({
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
    checkResults: a.check_results ? mapCheckResults(a.check_results) : undefined,
    error: a.error_message,
  };
}

export function mapRunStateNode(node: CoreRunStateNode): TaskNode {
  const lastAttempt = node.attempts_detail?.[node.attempts_detail.length - 1];
  const checkResults = lastAttempt?.check_results
    ? mapCheckResults(lastAttempt.check_results)
    : node.checks.map(c => ({
        id: c.id,
        label: c.description || c.name || c.id,
        passed: false,
      }));

  return {
    id: node.id,
    title: node.title || node.id,
    status: node.status as TaskStatus,
    mode: mapDagTypeToMode(node.dag_type),
    dependsOn: node.depends_on,
    dependedOnBy: node.depended_on_by,
    inputs: node.inputs,
    outputs: node.outputs,
    checks: checkResults,
    attempts: (node.attempts_detail || []).map(mapAttempt),
    spawnedChildren: node.spawned_children,
    dagType: node.dag_type,
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
    status: core.metadata.status as 'running' | 'complete' | 'error',
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
    case 'pending': return 'candidate';
    case 'active': return 'active';
    case 'done': return 'active';
    case 'rejected': return 'rejected';
    case 'stalled': return 'stalled';
    case 'blocked': return 'stalled';
    default: return 'candidate';
  }
}

export function mapRuntimeGoal(goal: CoreRuntimeGoal): PlaybookGoal {
  return {
    id: goal.id,
    description: goal.description,
    status: mapGoalStatus(goal.status_runtime),
    checks: goal.checks?.map((c: any) => typeof c === 'string' ? c : c.id) ?? [],
  };
}

/* ------------------------------------------------------------------ */
/*  Gap extraction from journal events                                 */
/* ------------------------------------------------------------------ */

export function extractGapsFromEvents(events: JournalEvent[]): Gap[] {
  const gapMap = new Map<string, Gap>();

  for (const ev of events) {
    if (ev.eventType === 'GAP_DETECTED' && ev.metadata) {
      const meta = ev.metadata as Record<string, any>;
      const gapId = meta.gapId || meta.gap_id || `gap-${ev.timestamp}`;
      gapMap.set(gapId, {
        id: gapId,
        type: (meta.type || 'plan') as GapType,
        level: (ev.level || 'task') as GapLevel,
        scope: ev.scope,
        description: ev.message || '',
        detected: ev.timestamp,
        resolved: false,
        severity: (meta.severity || 'medium') as GapSeverity,
      });
    }
    if (ev.eventType === 'GAP_RESOLVED' && ev.metadata) {
      const meta = ev.metadata as Record<string, any>;
      const gapId = meta.gapId || meta.gap_id;
      if (gapId && gapMap.has(gapId)) {
        gapMap.get(gapId)!.resolved = true;
      }
    }
  }

  return Array.from(gapMap.values());
}
