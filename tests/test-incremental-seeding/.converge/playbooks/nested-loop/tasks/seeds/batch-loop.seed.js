/**
 * Outer incremental seed: batch-loop.
 *
 * Spawns one batch child per DAG iteration. Each batch child is an
 * incremental seed that will spawn item children (inner loop).
 * Tracks progress by counting existing batch directories on disk.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const BATCHES = 2;

export async function run(ctx) {
  const existingCount = countChildren(ctx.spawnDir);

  if (existingCount >= BATCHES) {
    console.log(`  [batch-loop] all ${BATCHES} batches spawned — done`);
    return false;
  }

  const batchId = `batch-${String(existingCount).padStart(2, "0")}`;
  await ctx.spawn({
    id: batchId,
    title: `Batch #${existingCount + 1} (inner incremental loop)`,
    materialization: "incremental",
    seeds: [
      {
        type: "nodejs",
        path: ".converge/playbooks/nested-loop/tasks/seeds/item-loop.seed.js",
      },
    ],
    vars: { batchName: batchId },
    prompt: `Incremental seed container for ${batchId}. Spawns item children one per iteration.`,
  });

  console.log(`  [batch-loop] spawned ${batchId} (${existingCount + 1}/${BATCHES})`);
  ctx._keepLooping = true;
  return true;
}

function countChildren(spawnDir) {
  if (!existsSync(spawnDir)) return 0;
  return readdirSync(spawnDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith("batch-"))
    .length;
}
