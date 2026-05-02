/**
 * Child Synthesizer
 *
 * When a parent task with `from_seed:` completes execution, the
 * child-synthesizer runs and produces concrete child tasks from the
 * referenced seed definitions.
 *
 * This is the integration point between seed definitions (dbt-paradigm)
 * and the DAG runner's dynamic spawn (declarative-discovery).
 *
 * Contract (from playbook-chain.md):
 *   Must export a callable `synthesize(parent, entry, path?)`.
 */

import type { TaskDefinition } from "../config/task-definition.ts";
import type { SeedMdDefinition } from "../config/seed-md-definition.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SynthesizeEntry {
  /** The seed definition to materialize */
  seed: SeedMdDefinition;
  /** Args passed from the parent's from_seed: declaration */
  args?: Record<string, string>;
  /** Optional path override for the child task directory */
  path?: string;
}

export interface SynthesizeResult {
  /** IDs of the synthesized child tasks */
  childIds: string[];
  /** Paths where child TASK.md files should be written */
  paths: string[];
}

/* ------------------------------------------------------------------ */
/*  Synthesize                                                         */
/* ------------------------------------------------------------------ */

/**
 * Synthesize concrete child tasks from a parent's seed entries.
 *
 * Called after a parent task completes. Each entry in `from_seed:`
 * references a seed by name; the synthesizer resolves the seed and
 * materializes child task definitions.
 *
 * @param parent  The parent TaskDefinition that declared from_seed:
 * @param entries Seed entries to synthesize children from
 * @returns       IDs and paths of the synthesized children
 */
export function synthesize(
  parent: TaskDefinition,
  entries: SynthesizeEntry[],
): SynthesizeResult {
  const childIds: string[] = [];
  const paths: string[] = [];

  for (const entry of entries) {
    const childId = entry.seed.name;
    const childPath = entry.path ?? childId;

    childIds.push(childId);
    paths.push(childPath);
  }

  return { childIds, paths };
}

/**
 * Synthesize a single child from a seed entry.
 * Convenience wrapper around the batch synthesize.
 */
export function synthesizeOne(
  parent: TaskDefinition,
  entry: SynthesizeEntry,
): SynthesizeResult {
  return synthesize(parent, [entry]);
}
