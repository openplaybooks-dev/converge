/**
 * Phase 1 Initial Research WBS
 * Spawns the 4 sequential tasks for initial research phase
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const templateDir = join(projectDir, '.converge', 'playbooks', 'deep-research', 'wbs', 'templates', '001-initial');

  // Spawn tasks in sequence with dependencies
  const tasks = [
    { id: '001-initial-search', deps: [] },
    { id: '002-initial-gather', deps: ['001-initial-search'] },
    { id: '003-scope-identification', deps: ['002-initial-gather'] },
    { id: '004-initial-aggregation', deps: ['003-scope-identification'] }
  ];

  for (const task of tasks) {
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: relative(projectDir, join(templateDir, 'tasks', task.id, 'TASK.md')),
        vars: {
          taskId: task.id,
          question: ctx.vars.question,
          domain: ctx.vars.domain,
          artifactsDir: ctx.vars.artifactsDir,
          templatesDir: ctx.vars.templatesDir,
          maxEpochs: ctx.vars.maxEpochs,
          researchKey: ctx.vars.researchKey,
        },
      },
      {
        id: task.id,
        dependencies: task.deps
      },
    );
  }

  ctx.log.info('Spawned all Phase 1 tasks');
}
