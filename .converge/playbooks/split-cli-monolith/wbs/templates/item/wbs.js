/**
 * WBS: Per-PR pipeline — analyze → implement → review → quality
 *
 * This file is the SINGLE shared spawner for every PR. It lives in
 * `wbs/templates/item/wbs.js`. Every seeded per-PR TASK.md references this
 * file by absolute path via the `wbsSection` var — no sibling copies.
 *
 * Template resolution note:
 *   Even though this file is shared, converge may run it with __dirname
 *   equal to its real disk location (always the template dir). For safety
 *   we rely on `ctx.vars.itemTemplateDir` rather than __dirname.
 */

import { posix } from 'path';

export async function run(ctx) {
  const { taskId, title, tier, task, spec, projectDir, artifactsDir, itemTemplateDir } = ctx.vars;

  if (!itemTemplateDir) {
    throw new Error(
      'item/wbs.js: ctx.vars.itemTemplateDir is required. ' +
      'Root wbs/index.js must pass it when spawning from templates/item/TASK.md.',
    );
  }

  const projectDirPosix = projectDir.split('\\').join('/');

  for (const [prefix, phase] of [
    ['001', 'analyze'],
    ['002', 'implement'],
    ['003', 'review'],
    ['004', 'quality'],
  ]) {
    const phaseId = `${prefix}-${phase}`;
    const phaseTemplateDir = posix.join(itemTemplateDir, 'tasks', phase);
    const templatePath = posix.relative(projectDirPosix, posix.join(phaseTemplateDir, 'TASK.md'));

    // Only the `implement` phase has a nested WBS (plan/todos/verify).
    // analyze/review/quality are leaves. Pass empty wbsSection for leaves
    // so their TASK.md doesn't declare a wbs: field.
    const wbsSection = phase === 'implement'
      ? `wbs:\n  type: nodejs\n  path: "${phaseTemplateDir}/wbs.js"`
      : '';

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
          wbsSection,
        },
      },
      { id: phaseId },
    );
  }
}
