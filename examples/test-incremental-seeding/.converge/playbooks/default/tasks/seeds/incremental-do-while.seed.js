/**
 * Incremental seed: do-while pattern.
 *
 * Spawns one child per DAG iteration. Tracks progress by counting
 * already-spawned children in ctx.spawnDir (the journal directory).
 * After TOTAL children are spawned, returns false.
 */
import { existsSync, readdirSync } from "fs";

const TOTAL = 3;

export async function run(ctx) {
  const existingCount = countChildren(ctx.spawnDir);

  if (existingCount >= TOTAL) {
    console.log(`  [do-while] all ${TOTAL} children spawned — done`);
    return false;
  }

  const childId = `child-${String(existingCount).padStart(2, "0")}`;
  await ctx.spawn({
    id: childId,
    title: `Child #${existingCount + 1} of ${TOTAL}`,
    outputs: [`output-${childId}.txt`],
    checks: [
      {
        id: `${childId}-exists`,
        cmd: `test -f output-${childId}.txt`,
        description: `output-${childId}.txt exists`,
      },
    ],
    prompt: `Create output-${childId}.txt with exactly this content:\n\nchild ${existingCount}`,
  });

  console.log(`  [do-while] spawned ${childId} (${existingCount + 1}/${TOTAL})`);
  ctx._keepLooping = true;
  return true;
}

function countChildren(spawnDir) {
  if (!existsSync(spawnDir)) return 0;
  return readdirSync(spawnDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith("child-"))
    .length;
}
