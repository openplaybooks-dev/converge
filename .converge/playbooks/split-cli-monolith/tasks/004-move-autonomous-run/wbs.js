/**
 * WBS: Per-PR pipeline — analyze → implement → review → quality
 *
 * Template resolution note:
 *   This file is copied verbatim into each seeded task directory, so `__dirname`
 *   here points to `tasks/<pr-id>/`, NOT to `wbs/templates/item/`.
 *   We rely on `ctx.vars.itemTemplateDir` (set by the root wbs/index.js) to
 *   locate the phase TASK.md templates. Do not use `__dirname` for template paths.
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const { taskId, title, tier, task, spec, projectDir, artifactsDir, itemTemplateDir } = ctx.vars;

  if (!itemTemplateDir) {
    throw new Error(
      'item/wbs.js: ctx.vars.itemTemplateDir is required. ' +
      'Root wbs/index.js must pass it when spawning from templates/item/TASK.md.',
    );
  }

  for (const [prefix, phase] of [
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'review'],
    ['004', 'quality'],
  ]) {
    const phaseId = `${prefix}-${phase}`;
    const phaseTemplateDir = join(itemTemplateDir, 'tasks', phase);
    const templatePath = relative(ctx.projectDir, join(phaseTemplateDir, 'TASK.md'));

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
          // Pass the phase's own template dir so nested wbs.js (e.g. implement/wbs.js)
          // can find its own sub-templates.
          phaseTemplateDir,
        },
      },
      { id: phaseId },
    );
  }
}
