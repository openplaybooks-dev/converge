/**
 * Phase 2 Research-X WBS
 * Spawns the 4 sequential tasks for research-x epoch
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const templateDir = join(projectDir, '.converge', 'playbooks', 'deep-research', 'wbs', 'templates', '002-research-x');

  // Spawn tasks in sequence with dependencies
  const tasks = [
    { id: '001-subtopic-split', deps: [] },
    { id: '002-subtopic-research', deps: ['001-subtopic-split'] },
    { id: '003-cross-topic-aggregate', deps: ['002-subtopic-research'] },
    { id: '004-epoch-decision', deps: ['003-cross-topic-aggregate'] }
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
          epoch: ctx.vars.epoch,
        },
      },
      {
        id: task.id,
        dependencies: task.deps
      },
    );
  }

  ctx.log.info('Spawned all Phase 2 tasks');
}
