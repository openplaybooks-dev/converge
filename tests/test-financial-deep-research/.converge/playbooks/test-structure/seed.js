import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const outDir = join(ctx.projectDir, 'test-output');
  mkdirSync(outDir, { recursive: true });

  const orderPath = join(outDir, 'spawn-order.json');
  writeFileSync(orderPath, '[]');

  function record(id) {
    const data = JSON.parse(readFileSync(orderPath, 'utf-8'));
    data.push(id);
    writeFileSync(orderPath, JSON.stringify(data));
  }

  // 1. Spawn A (pipeline) FIRST — has its own seed spawning A1, A2
  await ctx.spawn({
    id: 'A-pipeline',
    title: 'A — Pipeline',
    seeds: [{ type: 'nodejs', path: join(ctx.projectDir, '.converge/playbooks/test-structure/seed-b.js') }],
    checks: [{ id: 'a-ok', cmd: 'echo A-done', description: 'A done' }],
    body: 'Pipeline task — spawns A1, A2 via its own seed.',
  });
  record('A-pipeline');

  // 2. Spawn B (cross-ticker) SECOND — depends on A
  await ctx.spawn({
    id: 'B-cross-ticker',
    title: 'B — Cross-Ticker',
    depends_on: ['A-pipeline'],
    checks: [{ id: 'b-ok', cmd: 'echo B-done', description: 'B done' }],
    body: 'Cross-ticker task — depends on A-pipeline.',
  });
  record('B-cross-ticker');

  // 3. Spawn C (report) THIRD — depends on B
  await ctx.spawn({
    id: 'C-report',
    title: 'C — Report',
    depends_on: ['B-cross-ticker'],
    checks: [{ id: 'c-ok', cmd: 'echo C-done', description: 'C done' }],
    body: 'Report task — depends on B-cross-ticker.',
  });
  record('C-report');
}
