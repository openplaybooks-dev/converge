import { mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const outDir = join(ctx.projectDir, 'test-output');
  mkdirSync(outDir, { recursive: true });

  // Spawn A1, A2 in order (mirrors aspect spawning)
  await ctx.spawn({
    id: 'A1-fundamental',
    title: 'A1 — Fundamental-like aspect',
    checks: [{ id: 'a1-ok', cmd: 'echo A1-done', description: 'A1 completes' }],
    body: 'Aspect A1 — fundamental analysis.',
  });
  appendFileSync(join(outDir, 'b-spawn-order.txt'), 'A1-fundamental\n');

  await ctx.spawn({
    id: 'A2-technical',
    title: 'A2 — Technical-like aspect',
    checks: [{ id: 'a2-ok', cmd: 'echo A2-done', description: 'A2 completes' }],
    body: 'Aspect A2 — technical analysis.',
  });
  appendFileSync(join(outDir, 'b-spawn-order.txt'), 'A2-technical\n');
}
