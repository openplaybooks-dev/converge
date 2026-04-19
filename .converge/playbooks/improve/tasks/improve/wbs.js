/**
 * WBS: Improve Converge Framework
 *
 * Each epoch spawns a 4-phase pipeline:
 *   001-analyze  → scan codebase, write analysis JSON
 *   002-implement  → fix highest-priority issue
 *   003-review   → code review (rejects → retry with feedback)
 *   004-quality  → typecheck + test gate
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const epoch = ctx.vars.epoch || '1';
  const epochStr = String(epoch).padStart(3, '0');
  const analysisDir = join(ctx.projectDir, '.converge', 'journal', 'analysis');

  // Spawn 4 sequential phases
  for (const [prefix, phase] of [
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'review'],
    ['004', 'quality'],
  ]) {
    const taskId = `${epochStr}-${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(__dirname, 'templates', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, epoch: epochStr, projectDir: ctx.projectDir, analysisDir,
      }},
      { id: taskId },
    );
  }
}
