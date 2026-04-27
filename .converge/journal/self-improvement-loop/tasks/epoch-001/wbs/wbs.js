/**
 * WBS: Epoch pipeline
 *
 *   001-analyze   → WBS parent that spawns parallel analysis subtasks + prioritize
 *   002-implement → fix the picked issue
 *   003-review    → code review (rejects → retry with feedback)
 *   004-quality   → typecheck + test gate
 *   005-changelog → summarize what changed for human review
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const epochTemplateDir = ctx.vars.epochTemplateDir;

  for (const [prefix, phase] of [
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'review'],
    ['004', 'quality'],
    ['005', 'changelog'],
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
