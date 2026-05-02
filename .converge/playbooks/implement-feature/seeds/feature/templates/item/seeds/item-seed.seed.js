/**
 * WBS: Item pipeline — analyze → implement → review → quality
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const task = ctx.vars.task;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;

  for (const [prefix, phase] of [
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'review'],
    ['004', 'quality'],
  ]) {
    const taskId = `${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(__dirname, 'tasks', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, task, projectDir, artifactsDir,
      }},
      { id: taskId },
    );
  }
}
