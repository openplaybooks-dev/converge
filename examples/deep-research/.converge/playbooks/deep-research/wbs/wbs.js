/**
 * Main WBS: Deep Research Pipeline
 *
 * Spawns a root research task that will spawn the 3 phases via its own WBS.
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  const templatesDir = join(projectDir, '.converge', 'playbooks', 'deep-research', 'wbs', 'templates');

  // Log what variables we're receiving
  ctx.log.info(`WBS context vars: ${JSON.stringify(ctx.vars)}`);

  // TEMPORARY: Hardcode the question for testing until framework variable passing is fixed
  const question = "What are the main causes of climate change?";
  const domain = "environmental science";
  const maxEpochs = "10";

  // Generate a unique research key from question + timestamp
  const questionSlug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);

  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const researchKey = `${questionSlug}-${timestamp}`;

  // Artifacts go under the research key
  const artifactsDir = join(projectDir, '.converge', 'artifacts', 'deep-research', researchKey);

  ctx.log.info(`Starting research with key: ${researchKey}`);

  // Spawn the root research task - its WBS will spawn the 3 phases
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, 'root', 'TASK.md')),
      vars: {
        taskId: researchKey,
        question: question,
        domain: domain,
        artifactsDir,
        templatesDir,
        maxEpochs: maxEpochs,
        researchKey: researchKey,
      },
    },
    { id: researchKey },
  );

  ctx.log.info('Spawned root task - it will spawn the 3 phases');
}
