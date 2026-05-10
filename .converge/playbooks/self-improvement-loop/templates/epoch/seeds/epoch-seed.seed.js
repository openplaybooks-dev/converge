/** Spawn the sequential stages for one framework improvement epoch. */
import { join, relative } from 'path';

export async function run(ctx) {
  const vars = ctx.vars;
  const stageIds = {
    observeTaskId: `${vars.taskId}-000-observe`,
    selectTaskId: `${vars.taskId}-001-select`,
    implementTaskId: `${vars.taskId}-002-implement`,
    verifyTaskId: `${vars.taskId}-003-verify`,
    summarizeTaskId: `${vars.taskId}-004-summarize`,
  };

  for (const [key, phase] of [
    ['observeTaskId', 'observe'],
    ['selectTaskId', 'select'],
    ['implementTaskId', 'implement'],
    ['verifyTaskId', 'verify'],
    ['summarizeTaskId', 'summarize'],
  ]) {
    const taskId = stageIds[key];
    const templatePath = relative(
      ctx.projectDir,
      join(vars.epochTemplateDir, 'tasks', phase, 'TASK.md'),
    );
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: { ...vars, ...stageIds, taskId },
      },
      { id: taskId },
    );
  }

  return ctx.loop.stop();
}
