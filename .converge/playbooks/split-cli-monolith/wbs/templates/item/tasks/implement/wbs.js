/**
 * WBS: Implement — plan → todos → verify
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const { title, task, spec, projectDir, artifactsDir } = ctx.vars;

  for (const [prefix, phase] of [
    ['001', 'plan'],
    ['002', 'todos'],
    ['003', 'verify'],
  ]) {
    const phaseId = `${prefix}-${phase}`;
    const templatePath = relative(
      ctx.projectDir,
      join(__dirname, 'tasks', phase, 'TASK.md'),
    );

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: {
          taskId: phaseId,
          title,
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
