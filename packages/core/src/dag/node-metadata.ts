/**
 * Typed accessors for transient DAG-node metadata.
 *
 * Several runtime properties don't fit the static DagNode type because
 * they only exist during certain phases of a run:
 *
 *   _incrementalSeedNotDone — a WBS-style seed needs another pass to
 *                             finish spawning its child set; treat as
 *                             "not yet ready for downstream" even
 *                             though the seed itself succeeded.
 *   _queueNotConverged     — a converge-loop node hasn't reached its
 *                            converge predicate yet; rerun on next pass.
 *
 * Pre-fix, callers wrote `(node as any)._incrementalSeedNotDone = true`
 * scattered across run/index.ts. That works, but every read site needs
 * its own `(node as any)?.X` cast and the field names are typo-prone.
 *
 * This module centralises the names + types behind small helpers.
 * Internally the data still lives on the node object — we don't allocate
 * a side table — but every read/write goes through a typed function.
 */

import type { DagNode } from "./dag-node.ts";

/**
 * The shape of transient run-time flags attached to a DagNode. All
 * fields are optional and may be absent. Stored as own properties of
 * the DagNode at runtime to avoid the overhead of a parallel Map.
 */
export interface NodeTransientFlags {
  /** WBS-style seed: more child-spawn passes are needed. */
  _incrementalSeedNotDone?: boolean;
  /** Converge-loop: predicate hasn't matched yet, rerun next pass. */
  _queueNotConverged?: boolean;
}

type WithFlags = DagNode & NodeTransientFlags;

export function setIncrementalSeedNotDone(node: DagNode, value: boolean): void {
  (node as WithFlags)._incrementalSeedNotDone = value;
}

export function isIncrementalSeedNotDone(node: DagNode): boolean {
  return (node as WithFlags)._incrementalSeedNotDone === true;
}

export function clearIncrementalSeedNotDone(node: DagNode): void {
  delete (node as WithFlags)._incrementalSeedNotDone;
}

export function setQueueNotConverged(node: DagNode, value: boolean): void {
  (node as WithFlags)._queueNotConverged = value;
}

export function isQueueNotConverged(node: DagNode): boolean {
  return (node as WithFlags)._queueNotConverged === true;
}

export function clearQueueNotConverged(node: DagNode): void {
  delete (node as WithFlags)._queueNotConverged;
}
