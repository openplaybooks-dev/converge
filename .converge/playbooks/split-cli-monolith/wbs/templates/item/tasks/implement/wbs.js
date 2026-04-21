/**
 * WBS: Implement — plan → todos → verify
 *
 * Template resolution note (see item/wbs.js for full explanation):
 *   `__dirname` here points to the seeded implement task dir, not the template source.
 *   We use `ctx.vars.phaseTemplateDir` (= absolute path to `wbs/templates/item/tasks/implement/`)
 *   to locate plan/todos/verify sub-templates.
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const { title, task, spec, projectDir, artifactsDir, phaseTemplateDir } = ctx.vars;

  if (!phaseTemplateDir) {
    throw new Error(
      'implement/wbs.js: ctx.vars.phaseTemplateDir is required. ' +
      'Parent item/wbs.js must pass it when spawning from implement/TASK.md.',
    );
  }

  for (const [prefix, phase] of [
    ['001', 'plan'],
    ['002', 'todos'],
    ['003', 'verify'],
  ]) {
    const phaseId = `${prefix}-${phase}`;
    const subTemplateDir = join(phaseTemplateDir, 'tasks', phase);
    const templatePath = relative(ctx.projectDir, join(subTemplateDir, 'TASK.md'));

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
          // Forward for any grandchild wbs that needs it (todos/wbs.js currently
          // spawns inline, so it doesn't need this — but pass anyway for symmetry).
          subTemplateDir,
        },
      },
      { id: phaseId },
    );
  }
}
