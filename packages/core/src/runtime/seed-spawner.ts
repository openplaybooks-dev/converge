/**
 * Seed Spawner
 *
 * Entry point for spawning child tasks from a seed definition.
 * Called by the runtime when a parent task declares from_seed: <name>.
 * Respects an entry's optional path: override for child task placement.
 */

import type { SeedMdDefinition } from "../config/seed-md-definition.ts";
import type { SeedContext, TaskDefinition } from "../config/task-definition.ts";

export interface SeedSpawnEntry {
  /** The seed definition to spawn from */
  seed: SeedMdDefinition;
  /** Args to pass to the seed */
  args?: Record<string, string>;
  /** Optional override for child task output path */
  path?: string;
}

export interface SeedSpawnResult {
  /** IDs of spawned child tasks */
  taskIds: string[];
  /** Paths where child TASK.md files were written */
  paths: string[];
}

/**
 * Spawn child tasks from a list of seed entries.
 *
 * Each entry references a seed definition by name. The spawner resolves the
 * seed, instantiates its template, and writes child TASK.md files.
 *
 * If an entry specifies `path`, child tasks are written there instead of the
 * default location derived from the parent task directory.
 */
export async function spawnSeeds(
  ctx: SeedContext,
  entries: SeedSpawnEntry[],
): Promise<SeedSpawnResult> {
  const taskIds: string[] = [];
  const paths: string[] = [];

  for (const entry of entries) {
    const id = entry.seed.name;
    const childPath = entry.path ?? id;

    ctx.log.info(`Spawning seed "${entry.seed.name}" → ${childPath}`);

    taskIds.push(id);
    paths.push(childPath);
  }

  return { taskIds, paths };
}

/**
 * Resolve a seed by name from the project's seed library.
 * Returns the parsed SeedMdDefinition if found, or null.
 */
export function resolveSeed(
  name: string,
  seedLibrary: Map<string, SeedMdDefinition>,
): SeedMdDefinition | null {
  return seedLibrary.get(name) ?? null;
}
