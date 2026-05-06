/**
 * Inner incremental seed: item-loop.
 *
 * Runs inside each batch child. Spawns one item per DAG iteration.
 * Tracks progress by counting existing item directories on disk.
 * Uses ctx.vars.batchName (passed from the outer loop seed).
 */
import { existsSync, readdirSync } from "fs";

const ITEMS_PER_BATCH = 2;

export async function run(ctx) {
  const batchName = ctx.vars.batchName || "batch-unknown";
  const existingCount = countChildren(ctx.spawnDir);

  if (existingCount >= ITEMS_PER_BATCH) {
    console.log(`  [item-loop:${batchName}] all ${ITEMS_PER_BATCH} items spawned — done`);
    return false;
  }

  const itemLabel = String.fromCharCode(65 + existingCount); // A, B, C...
  const itemId = `${batchName}-item-${itemLabel}`;
  await ctx.spawn({
    id: itemId,
    title: `${batchName} item ${itemLabel}`,
    outputs: [`output-${itemId}.txt`],
    checks: [
      {
        id: `${itemId}-exists`,
        cmd: `test -f output-${itemId}.txt`,
        description: `output-${itemId}.txt exists`,
      },
    ],
    prompt: `Create output-${itemId}.txt with exactly this content:\n\n${batchName} item ${itemLabel}`,
  });

  console.log(`  [item-loop:${batchName}] spawned ${itemId} (${existingCount + 1}/${ITEMS_PER_BATCH})`);
  ctx._keepLooping = true;
  return true;
}

function countChildren(spawnDir) {
  if (!existsSync(spawnDir)) return 0;
  return readdirSync(spawnDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.includes("-item-"))
    .length;
}
