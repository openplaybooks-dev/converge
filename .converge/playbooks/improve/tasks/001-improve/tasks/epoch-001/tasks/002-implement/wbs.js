/**
 * WBS: Implement fix
 *
 *   001-plan   → read analysis, write implementation plan
 *   002-todos  → split plan into todos, spawn one subtask per todo
 *   003-verify → final typecheck + test gate
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const epochTemplateDir = ctx.vars.epochTemplateDir;
  const implementTemplateDir = join(epochTemplateDir, 'tasks', 'implement');

  for (const [prefix, phase] of [
    ['001', 'plan'],
    ['002', 'todos'],
    ['003', 'verify'],
  ]) {
    const taskId = `${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(implementTemplateDir, 'tasks', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, epoch, projectDir, artifactsDir, epochTemplateDir,
      }},
      { id: taskId },
    );
  }
}
