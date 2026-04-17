/**
 * Resumability with Cursor Reconciliation
 *
 * Handles resume from checkpoint with tree reconciliation for structure changes.
 * Implements graceful degradation when tree structure has changed.
 */

import type { Checkpoint, Cursor } from '../storage/types.ts';
import type { TaskTree } from './tree-utils.ts';
import { discoverTaskHierarchy, hashTaskTree } from './tree-utils.ts';
import { migrateCheckpointV1toV2, needsMigration } from './migration.ts';
import fs from 'node:fs/promises';
import path from 'node:path';

/* ------------------------------------------------------------------ */
/*  Resume Point                                                      */
/* ------------------------------------------------------------------ */

/**
 * Resume strategy type
 */
export type ResumeStrategy =
  | 'exact-restore' // Tree unchanged, restore cursor exactly
  | 'reconciled' // Tree changed, validated and restored
  | 'parent-fallback' // Current node deleted, resume at parent
  | 'restart' // Epic deleted or major structure change
  | 'legacy'; // V1 checkpoint, no cursor available

/**
 * Resume point with reconciliation info
 */
export interface ResumePoint {
  /** Cursor position to resume at (null = restart from beginning) */
  cursor: Cursor | null;

  /** Resume strategy used */
  resumeStrategy: ResumeStrategy;

  /** Whether tree structure changed since checkpoint */
  treeChanged?: boolean;

  /** Depth lost during reconciliation (for parent-fallback) */
  lostDepth?: number;

  /** Validation warnings */
  warnings?: string[];
}

/* ------------------------------------------------------------------ */
/*  Resume from Checkpoint                                            */
/* ------------------------------------------------------------------ */

/**
 * Resume from checkpoint with tree reconciliation
 *
 * Handles:
 * - V1 checkpoint migration
 * - Tree structure changes
 * - Deleted/moved tasks
 * - Graceful fallback
 */
export async function resumeFromCheckpoint(
  checkpoint: Checkpoint,
  harnessDir: string
): Promise<ResumePoint> {
  // Migrate v1 checkpoint if needed
  if (needsMigration(checkpoint)) {
    const migrated = migrateCheckpointV1toV2(checkpoint as any);
    return {
      cursor: migrated.cursor || null,
      resumeStrategy: 'legacy',
      warnings: ['Checkpoint migrated from v1 to v2, cursor may be inaccurate'],
    };
  }

  // If no cursor (shouldn't happen with v2), fall back to legacy
  if (!checkpoint.cursor) {
    return {
      cursor: null,
      resumeStrategy: 'legacy',
      warnings: ['V2 checkpoint has no cursor, restarting from beginning'],
    };
  }

  // Re-discover current task tree
  const epicId = checkpoint.state?.currentEpic;
  if (!epicId) {
    return {
      cursor: null,
      resumeStrategy: 'restart',
      warnings: ['No current epic in checkpoint'],
    };
  }

  const epicPath = path.join(harnessDir, 'epics', epicId);
  let currentTree: TaskTree;

  try {
    currentTree = await discoverTaskHierarchy(epicPath);
  } catch (error) {
    return {
      cursor: null,
      resumeStrategy: 'restart',
      warnings: [`Failed to discover task hierarchy: ${error}`],
    };
  }

  // Compare with checkpoint tree
  const snapshot = checkpoint.treeSnapshot as { structureHash: string } | undefined;
  const treeChanged =
    snapshot && currentTree.hash !== snapshot.structureHash;

  if (!treeChanged) {
    // Fast path: tree unchanged, restore cursor exactly
    return {
      cursor: checkpoint.cursor,
      resumeStrategy: 'exact-restore',
      treeChanged: false,
    };
  }

  // Slow path: reconcile cursor with changed tree
  return reconcileCursor(checkpoint.cursor, currentTree, epicPath);
}

/* ------------------------------------------------------------------ */
/*  Cursor Reconciliation                                             */
/* ------------------------------------------------------------------ */

/**
 * Reconcile cursor when tree structure changed
 *
 * Validates each level in the breadcrumb path and falls back gracefully.
 */
async function reconcileCursor(
  cursor: Cursor,
  currentTree: TaskTree,
  epicPath: string
): Promise<ResumePoint> {
  const breadcrumbs = cursor.breadcrumbs;
  const reconciledPath: string[] = [];
  const warnings: string[] = [];

  // Walk down breadcrumb path, validating each level exists
  for (let i = 0; i < breadcrumbs.length; i++) {
    const crumb = breadcrumbs[i];

    // Check if node still exists at expected path
    let nodeExists = false;
    try {
      const stats = await fs.stat(crumb.filePath);
      nodeExists = stats.isFile();
    } catch {
      nodeExists = false;
    }

    if (!nodeExists) {
      // Node deleted/moved, fall back to parent
      if (i > 0) {
        warnings.push(`Task ${crumb.id} no longer exists, resuming at parent ${breadcrumbs[i - 1].id}`);

        return {
          cursor: {
            path: breadcrumbs.slice(0, i).map((b) => b.id),
            breadcrumbs: breadcrumbs.slice(0, i),
            depth: i - 1,
          },
          resumeStrategy: 'parent-fallback',
          lostDepth: breadcrumbs.length - i,
          treeChanged: true,
          warnings,
        };
      } else {
        // Even epic is gone, restart
        warnings.push('Epic no longer exists, restarting from beginning');

        return {
          cursor: null,
          resumeStrategy: 'restart',
          treeChanged: true,
          warnings,
        };
      }
    }

    reconciledPath.push(crumb.id);
  }

  // All breadcrumbs validated
  return {
    cursor: {
      path: reconciledPath,
      breadcrumbs,
      depth: reconciledPath.length - 1,
    },
    resumeStrategy: 'reconciled',
    treeChanged: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Resume Point Helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Get human-readable description of resume point
 */
export function describeResumePoint(resumePoint: ResumePoint): string {
  const { cursor, resumeStrategy, treeChanged, lostDepth, warnings } = resumePoint;

  let description = '';

  switch (resumeStrategy) {
    case 'exact-restore':
      description = `Resuming at exact checkpoint position: ${cursor?.path.join(' → ')}`;
      break;

    case 'reconciled':
      description = `Resuming at position: ${cursor?.path.join(' → ')} (tree changed, reconciled)`;
      break;

    case 'parent-fallback':
      description = `Resuming at parent level: ${cursor?.path.join(' → ')} (${lostDepth} level${
        lostDepth === 1 ? '' : 's'
      } lost)`;
      break;

    case 'restart':
      description = 'Restarting from beginning (checkpoint position no longer valid)';
      break;

    case 'legacy':
      description = cursor
        ? `Resuming from v1 checkpoint at: ${cursor.path.join(' → ')}`
        : 'Restarting from beginning (legacy checkpoint)';
      break;
  }

  if (warnings && warnings.length > 0) {
    description += `\nWarnings:\n${warnings.map((w) => `  - ${w}`).join('\n')}`;
  }

  return description;
}

/**
 * Check if resume point is at beginning
 */
export function isResumeAtBeginning(resumePoint: ResumePoint): boolean {
  return resumePoint.cursor === null || resumePoint.cursor.path.length === 0;
}

/**
 * Get current epic from resume point
 */
export function getCurrentEpic(resumePoint: ResumePoint): string | null {
  if (!resumePoint.cursor || resumePoint.cursor.path.length === 0) {
    return null;
  }

  return resumePoint.cursor.path[0];
}

/**
 * Get current task from resume point
 */
export function getCurrentTask(resumePoint: ResumePoint): string | null {
  if (!resumePoint.cursor || resumePoint.cursor.path.length < 2) {
    return null;
  }

  return resumePoint.cursor.path[1];
}

/**
 * Get cursor depth
 */
export function getCursorDepth(resumePoint: ResumePoint): number {
  return resumePoint.cursor?.depth ?? -1;
}
