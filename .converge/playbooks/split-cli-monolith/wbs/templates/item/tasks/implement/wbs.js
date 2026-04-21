/**
 * WBS: Implement — plan → todos → verify
 *
 * SHARED spawner for every implement phase. Lives in
 * `wbs/templates/item/tasks/implement/wbs.js` and is referenced by
 * every seeded implement TASK.md via absolute path (no sibling copies).
 */

import { posix } from 'path';

export async function run(ctx) {
  const { title, task, spec, projectDir, artifactsDir, phaseTemplateDir } = ctx.vars;

  if (!phaseTemplateDir) {
    throw new Error(
      'implement/wbs.js: ctx.vars.phaseTemplateDir is required. ' +
      'Parent item/wbs.js must pass it when spawning from implement/TASK.md.',
    );
  }

  const projectDirPosix = projectDir.split('\\').join('/');

  for (const [prefix, phase] of [
    ['001', 'plan'],
    ['002', 'todos'],
    ['003', 'verify'],
  ]) {
    const phaseId = `${prefix}-${phase}`;
    const subTemplateDir = posix.join(phaseTemplateDir, 'tasks', phase);
    const templatePath = posix.relative(projectDirPosix, posix.join(subTemplateDir, 'TASK.md'));

    // Only `todos` has a nested WBS (parses plan.md, spawns step tasks).
    // plan/verify are leaves.
    const wbsSection = phase === 'todos'
      ? `wbs:\n  type: nodejs\n  path: "${subTemplateDir}/wbs.js"`
      : '';

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
          subTemplateDir,
          wbsSection,
        },
      },
      { id: phaseId },
    );
  }
}
