/**
 * Checkpoint Migration Utilities
 *
 * Handles migration from v1 (flat) to v2 (hierarchical) checkpoint format.
 * Provides best-effort cursor inference from v1 checkpoints.
 */

import type {
  CheckpointV1,
  Checkpoint,
  Cursor,
  CompletionTree,
  CompletionNode,
  TreeSnapshot,
} from "../storage/types.ts";

/* ------------------------------------------------------------------ */
/*  Version Detection                                                 */
/* ------------------------------------------------------------------ */

/**
 * Detect checkpoint version
 */
export function detectCheckpointVersion(checkpoint: any): 1 | 2 {
  // v2 checkpoints have version field
  if ("version" in checkpoint && checkpoint.version === 2) {
    return 2;
  }

  // v1 checkpoints don't have version field
  return 1;
}

/**
 * Check if checkpoint needs migration
 */
export function needsMigration(checkpoint: any): boolean {
  return detectCheckpointVersion(checkpoint) === 1;
}

/* ------------------------------------------------------------------ */
/*  V1 → V2 Migration                                                */
/* ------------------------------------------------------------------ */

/**
 * Migrate v1 checkpoint to v2 (best-effort)
 *
 * Infers cursor from flat completed task lists.
 * Creates empty tree snapshot to force reconciliation on resume.
 */
export function migrateCheckpointV1toV2(v1: CheckpointV1): Checkpoint {
  // Infer cursor from flat completed tasks (best guess)
  const cursor = inferCursorFromV1(v1);

  // Build completion tree from flat lists
  const completionTree = buildTreeFromFlatLists(
    v1.completed.epics,
    v1.completed.tasks,
  );

  // No tree snapshot available - empty hash triggers reconciliation on resume
  const treeSnapshot: TreeSnapshot = {
    structureHash: "", // Empty = force reconciliation
    taskPaths: [],
  };

  return {
    version: 2,
    id: v1.id,
    timestamp: v1.timestamp,
    iteration: v1.iteration,
    state: v1.state,
    cursor,
    completionTree,
    treeSnapshot,
    gaps: v1.gaps,
    completed: v1.completed,
    metadata: v1.metadata,
  };
}

/**
 * Infer cursor from v1 checkpoint state
 *
 * Best-effort reconstruction of execution position from flat state.
 */
function inferCursorFromV1(v1: CheckpointV1): Cursor | undefined {
  const { currentEpic, currentTask } = v1.state;

  if (!currentEpic) {
    return undefined;
  }

  const path: string[] = [currentEpic];
  const breadcrumbs: Array<{
    id: string;
    type: "playbook" | "task" | "subtask";
    filePath: string;
    depth: number;
  }> = [
    {
      id: currentEpic,
      type: "playbook",
      filePath: `.converge/epics/${currentEpic}/epic.ts`,
      depth: 0,
    },
  ];

  if (currentTask) {
    path.push(currentTask);
    breadcrumbs.push({
      id: currentTask,
      type: "task",
      filePath: `.converge/epics/${currentEpic}/${currentTask}/SKILL.md`,
      depth: 1,
    });
  }

  return {
    path,
    breadcrumbs,
    depth: path.length - 1,
  };
}

/**
 * Build hierarchical completion tree from flat lists
 *
 * Creates a minimal completion tree from completed epic/task lists.
 * Doesn't capture true hierarchy (parent-child relationships unknown).
 */
function buildTreeFromFlatLists(
  completedEpics: string[],
  completedTasks: string[],
): CompletionTree {
  const nodes: Record<string, CompletionNode> = {};

  // Add completed epics
  for (const epicId of completedEpics) {
    nodes[epicId] = {
      id: epicId,
      status: "completed",
      completedAt: new Date().toISOString(),
      childIds: [],
    };
  }

  // Add completed tasks (no parent info available in v1)
  for (const taskId of completedTasks) {
    nodes[taskId] = {
      id: taskId,
      status: "completed",
      completedAt: new Date().toISOString(),
      childIds: [],
    };
  }

  return { nodes };
}

/* ------------------------------------------------------------------ */
/*  Migration Validation                                              */
/* ------------------------------------------------------------------ */

/**
 * Validate migrated checkpoint
 *
 * Ensures the migrated v2 checkpoint is valid.
 */
export function validateMigratedCheckpoint(checkpoint: Checkpoint): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required v2 fields
  if (!checkpoint.version || checkpoint.version !== 2) {
    errors.push("Missing or invalid version field");
  }

  // Cursor is optional but should be valid if present
  if (checkpoint.cursor) {
    if (!checkpoint.cursor.path || checkpoint.cursor.path.length === 0) {
      errors.push("Cursor has empty path");
    }

    if (
      !checkpoint.cursor.breadcrumbs ||
      checkpoint.cursor.breadcrumbs.length === 0
    ) {
      errors.push("Cursor has empty breadcrumbs");
    }

    if (
      checkpoint.cursor.path.length !== checkpoint.cursor.breadcrumbs.length
    ) {
      errors.push("Cursor path and breadcrumbs length mismatch");
    }

    if (checkpoint.cursor.depth !== checkpoint.cursor.path.length - 1) {
      errors.push("Cursor depth mismatch");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Batch Migration                                                   */
/* ------------------------------------------------------------------ */

/**
 * Migrate multiple checkpoints
 */
export function migrateCheckpoints(checkpoints: CheckpointV1[]): Checkpoint[] {
  return checkpoints.map(migrateCheckpointV1toV2);
}

/**
 * Get migration summary
 */
export function getMigrationSummary(
  original: CheckpointV1[],
  migrated: Checkpoint[],
): {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ id: string; errors: string[] }>;
} {
  const summary = {
    total: original.length,
    successful: 0,
    failed: 0,
    errors: [] as Array<{ id: string; errors: string[] }>,
  };

  for (const checkpoint of migrated) {
    const validation = validateMigratedCheckpoint(checkpoint);

    if (validation.valid) {
      summary.successful++;
    } else {
      summary.failed++;
      summary.errors.push({
        id: checkpoint.id,
        errors: validation.errors,
      });
    }
  }

  return summary;
}
