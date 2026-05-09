/**
 * Epoch pipeline — spawns 4 sequential stages:
 *
 *   000-test      → run a framework test, analyze results for bugs
 *   001-analyze   → pick the single most impactful improvement
 *   002-implement → apply the fix
 *   003-verify    → typecheck + test gate (on fail: reset implement)
 *
 * The while loop: verify → implement → verify → ... until verify passes.
 */
import { join, relative } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const epochTemplateDir = ctx.vars.epochTemplateDir;

  for (const [prefix, phase] of [
    ['000', 'test'],
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'verify'],
  ]) {
    const taskId = `${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(epochTemplateDir, 'tasks', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, epoch, projectDir, artifactsDir, epochTemplateDir,
      }},
      { id: taskId },
    );
  }
}
