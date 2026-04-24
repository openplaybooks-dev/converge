/**
 * Phase 3 Final Report WBS
 * Spawns the final report task
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const templateDir = join(projectDir, '.converge', 'playbooks', 'deep-research', 'wbs', 'templates', '003-report');

  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templateDir, 'tasks', 'final-report', 'TASK.md')),
      vars: {
        taskId: 'final-report',
        question: ctx.vars.question,
        domain: ctx.vars.domain,
        artifactsDir: ctx.vars.artifactsDir,
        templatesDir: ctx.vars.templatesDir,
        researchKey: ctx.vars.researchKey,
      },
    },
    { id: 'final-report' }
  );

  ctx.log.info('Spawned final report task');
}
