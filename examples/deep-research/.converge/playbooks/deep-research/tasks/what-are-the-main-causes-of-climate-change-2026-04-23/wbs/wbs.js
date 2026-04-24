/**
 * Root WBS: Spawn the 3 main phases
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const templatesDir = ctx.vars.templatesDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const question = ctx.vars.question;
  const domain = ctx.vars.domain;
  const maxEpochs = ctx.vars.maxEpochs;
  const researchKey = ctx.vars.researchKey;

  ctx.log.info('Spawning 3 main phases: 001-initial, 002-research-x, 003-report');

  // Phase 1: Initial Research
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, '001-initial', 'TASK.md')),
      vars: {
        taskId: '001-initial',
        question,
        domain,
        artifactsDir,
        templatesDir,
        maxEpochs,
        researchKey,
      },
    },
    { id: '001-initial' }
  );

  // Phase 2: Research-X
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, '002-research-x', 'TASK.md')),
      vars: {
        taskId: '002-research-x',
        question,
        domain,
        artifactsDir,
        templatesDir,
        maxEpochs,
        researchKey,
        epoch: '1',
      },
    },
    {
      id: '002-research-x',
      dependencies: ['001-initial']
    }
  );

  // Phase 3: Final Report
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, '003-report', 'TASK.md')),
      vars: {
        taskId: '003-report',
        question,
        domain,
        artifactsDir,
        templatesDir,
        researchKey,
      },
    },
    {
      id: '003-report',
      dependencies: ['002-research-x']
    }
  );

  ctx.log.info('Spawned all 3 phases');
}
