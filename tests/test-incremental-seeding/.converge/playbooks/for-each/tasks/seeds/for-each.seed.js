/**
 * For-each incremental seed.
 *
 * Spawns one child per DAG iteration from a fixed list. Tracks progress
 * by counting already-spawned children in ctx.spawnDir (the journal).
 * Returns false when all items have been processed.
 */
import { existsSync, readdirSync } from "fs";

const ITEMS = ["alpha", "beta", "gamma", "delta"];

export async function run(ctx) {
  const existingCount = countChildren(ctx.spawnDir);

  if (existingCount >= ITEMS.length) {
    console.log(`  [for-each] all ${ITEMS.length} items processed — done`);
    return false;
  }

  const item = ITEMS[existingCount];
  await ctx.spawn({
    id: `process-${item}`,
    title: `Process ${item}`,
    outputs: [`processed-${item}.txt`],
    checks: [
      {
        id: `check-${item}`,
        cmd: `test -f processed-${item}.txt && grep -q "${item}" processed-${item}.txt`,
        description: `processed-${item}.txt exists with correct content`,
      },
    ],
    prompt: `Create processed-${item}.txt with exactly this content:\n\n${item}`,
  });

  console.log(`  [for-each] spawned process-${item} (${existingCount + 1}/${ITEMS.length})`);
  ctx._keepLooping = true;
  return true;
}

function countChildren(spawnDir) {
  if (!existsSync(spawnDir)) return 0;
  return readdirSync(spawnDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith("process-"))
    .length;
}
