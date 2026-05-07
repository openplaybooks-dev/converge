/**
 * Incremental seed: drain-epoch (do-while queue pattern).
 *
 * Mimics discover's crawl-epoch.seed.js:
 * - Scans completed items in pages/ directory
 * - Discovers follow-up items from completed outputs
 * - Enqueues new items into pending
 * - Spawns one process-{id} child per pass
 * - Returns false when queue drained (pending=0 AND processing=0)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "fs";
import { join } from "path";

const DISCOVERY_MAP = {
  alpha: ["gamma"],
  beta: ["delta"],
  gamma: [],
  delta: [],
};

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const queueFile = join(projectDir, ".converge", "artifacts", "queue-pattern", "queue.json");
  const pagesDir = join(projectDir, ".converge", "artifacts", "queue-pattern", "pages");

  if (!existsSync(pagesDir)) mkdirSync(pagesDir, { recursive: true });

  if (!existsSync(queueFile)) {
    ctx.log.error("No queue.json found");
    return false;
  }

  const queue = JSON.parse(readFileSync(queueFile, "utf-8"));
  queue.pending = queue.pending || [];
  queue.processing = queue.processing || [];
  queue.done = queue.done || [];
  queue.seen_ids = queue.seen_ids || [];
  queue.stats = queue.stats || { total_discovered: 0, total_processed: 0, passes: 0 };

  // Phase 1: Scan completed items, discover follow-up work
  const stillProcessing = [];
  for (const item of queue.processing) {
    const pageFile = join(pagesDir, `${item.id}.json`);
    if (existsSync(pageFile)) {
      const discovered = DISCOVERY_MAP[item.id] || [];
      for (const newId of discovered) {
        if (!queue.seen_ids.includes(newId)) {
          queue.pending.push({ id: newId, depth: (item.depth || 0) + 1 });
          queue.seen_ids.push(newId);
          queue.stats.total_discovered = (queue.stats.total_discovered || 0) + 1;
        }
      }
      if (discovered.length > 0) {
        ctx.log.info(`Discovered ${discovered.length} follow-up(s) from ${item.id}: [${discovered}]`);
      }
      queue.done.push({ id: item.id, depth: item.depth, processed: true });
      queue.stats.total_processed = (queue.stats.total_processed || 0) + 1;
    } else {
      stillProcessing.push(item);
    }
  }
  queue.processing = stillProcessing;

  // Phase 2: Convergence check
  if (queue.pending.length === 0 && queue.processing.length === 0) {
    queue.stats.passes = (queue.stats.passes || 0) + 1;
    writeFileSync(queueFile, JSON.stringify(queue, null, 2));
    ctx.log.info(`Queue drained — ${queue.stats.total_processed} item(s) in ${queue.stats.passes} pass(es)`);
    return false;
  }

  // Phase 3: Spawn next child
  if (queue.pending.length > 0) {
    const next = queue.pending.shift();
    queue.processing.push(next);
    queue.stats.passes = (queue.stats.passes || 0) + 1;
    writeFileSync(queueFile, JSON.stringify(queue, null, 2));

    const discovered = DISCOVERY_MAP[next.id] || [];

    await ctx.spawn({
      id: `process-${next.id}`,
      title: `Process: ${next.id}`,
      outputs: [`.converge/artifacts/queue-pattern/pages/${next.id}.json`],
      checks: [
        { id: `${next.id}-data`, cmd: `test -f .converge/artifacts/queue-pattern/pages/${next.id}.json` },
        { id: `${next.id}-valid`, cmd: `jq -e '.id == "${next.id}"' .converge/artifacts/queue-pattern/pages/${next.id}.json` },
      ],
      body: `Write .converge/artifacts/queue-pattern/pages/${next.id}.json:

\`\`\`json
{
  "id": "${next.id}",
  "depth": ${next.depth || 0},
  "processed_at": "${new Date().toISOString()}",
  "data": { "value": "${next.id}-result" },
  "discovered": ${JSON.stringify(discovered)}
}
\`\`\``,
    });

    ctx.log.info(`Spawned process-${next.id} (${queue.stats.total_processed + 1} done, ${queue.pending.length} pending)`);
    ctx._keepLooping = true;
    return true;
  }

  // Phase 4: Waiting for in-flight children
  queue.stats.passes = (queue.stats.passes || 0) + 1;
  writeFileSync(queueFile, JSON.stringify(queue, null, 2));
  ctx.log.info(`Waiting for ${queue.processing.length} in-flight process(es)`);
  ctx._keepLooping = true;
  return true;
}

function countChildren(spawnDir) {
  if (!existsSync(spawnDir)) return 0;
  return readdirSync(spawnDir, { withFileTypes: true })
    .filter(e => e.isDirectory() && e.name.startsWith("process-"))
    .length;
}
