/**
 * WBS: Per-PR pipeline — analyze → implement → review → quality
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const { taskId, title, tier, task, spec, projectDir, artifactsDir } = ctx.vars;

  for (const [prefix, phase] of [
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'review'],
    ['004', 'quality'],
  ]) {
    const phaseId = `${prefix}-${phase}`;
    const templatePath = relative(
      ctx.projectDir,
      join(__dirname, '..', '..', 'wbs', 'templates', 'item', 'tasks', phase, 'TASK.md'),
    );

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: {
          taskId: phaseId,
          parentId: taskId,
          title,
          tier,
          task,
          spec,
          projectDir,
          artifactsDir,
        },
      },
      { id: phaseId },
    );
  }
}