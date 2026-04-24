/**
 * WBS: Subtopic Research with Recursive Decomposition
 *
 * This WBS spawns child tasks for a subtopic:
 * 1. Research task - conducts the actual research
 * 2. Decomposition task - decides if this subtopic needs further breakdown into sub-subtopics
 * 3. If decomposition identifies sub-subtopics, spawn them recursively
 */

import { join, relative } from 'path';
import { readFileSync, existsSync } from 'fs';

export async function run(ctx) {
  const projectDir = ctx.projectDir;

  // Use variables from context
  const artifactsDir = ctx.vars.artifactsDir;
  const templatesDir = ctx.vars.templatesDir;
  const question = ctx.vars.question;
  const domain = ctx.vars.domain;
  const maxEpochs = ctx.vars.maxEpochs;
  const epoch = parseInt(ctx.vars.epoch || '1', 10);
  const subtopicId = ctx.vars.subtopicId;
  const subtopicName = ctx.vars.subtopicName;
  const subtopicDescription = ctx.vars.subtopicDescription;

  ctx.log.info(`Spawning research tasks for subtopic: ${subtopicName} (${subtopicId})`);

  // Task 1: Conduct research on this subtopic
  const researchTaskId = `${subtopicId}-research`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, '002-research-x', 'tasks', '002-subtopic-research', 'templates', 'subtopic-task', 'tasks', 'research', 'TASK.md')),
      vars: {
        taskId: researchTaskId,
        epoch,
        subtopicId,
        subtopicName,
        subtopicDescription,
        question,
        domain,
        artifactsDir,
        templatesDir,
        maxEpochs,
      },
    },
    { id: researchTaskId },
  );

  // Task 2: Decide if this subtopic needs decomposition into sub-subtopics
  const decomposeTaskId = `${subtopicId}-decompose`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, '002-research-x', 'tasks', '002-subtopic-research', 'templates', 'subtopic-task', 'tasks', 'decompose', 'TASK.md')),
      vars: {
        taskId: decomposeTaskId,
        epoch,
        subtopicId,
        subtopicName,
        subtopicDescription,
        question,
        domain,
        artifactsDir,
        templatesDir,
        maxEpochs,
      },
    },
    { id: decomposeTaskId },
  );

  // Task 3: Spawn sub-subtopics if decomposition identified them
  const subSubtopicsTaskId = `${subtopicId}-sub-subtopics`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(projectDir, join(templatesDir, '002-research-x', 'tasks', '002-subtopic-research', 'templates', 'subtopic-task', 'tasks', 'sub-subtopics', 'TASK.md')),
      vars: {
        taskId: subSubtopicsTaskId,
        epoch,
        subtopicId,
        subtopicName,
        subtopicDescription,
        question,
        domain,
        artifactsDir,
        templatesDir,
        maxEpochs,
      },
    },
    { id: subSubtopicsTaskId },
  );

  ctx.log.info(`Spawned 3 tasks for subtopic ${subtopicId}: research, decompose, sub-subtopics`);
}
