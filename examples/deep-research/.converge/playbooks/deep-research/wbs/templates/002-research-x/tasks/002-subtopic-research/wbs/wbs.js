/**
 * WBS: Sub-topic Research Splitter
 *
 * Reads subtopics from the current epoch's split task and spawns parallel
 * research tasks for each sub-topic.
 *
 * Note: Epoch progression is handled by the epoch-decision task's after WBS,
 * which spawns the next research-x iteration when continue=true.
 *
 * Input: {{artifactsDir}}/epoch-{{epoch}}-001-subtopic-split/subtopics.json
 * Output: Spawns individual research tasks per sub-topic for current epoch
 */

import { join, relative } from 'path';
import { readFileSync, existsSync } from 'fs';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const templatesDir = ctx.vars.templatesDir;
  const currentEpoch = parseInt(ctx.vars.epoch ?? '1', 10);

  ctx.log.info(`Spawning subtopic research tasks for epoch ${currentEpoch}`);

  // Read subtopics from the split task output
  const subtopicsPath = join(artifactsDir, '1-initial', 'subtopics.json');

  if (!existsSync(subtopicsPath)) {
    ctx.log.warn(`No subtopics found at ${subtopicsPath} - nothing to spawn`);
    return;
  }

  const subtopicsData = JSON.parse(readFileSync(subtopicsPath, 'utf-8'));
  const subtopics = subtopicsData.subtopics || subtopicsData.items || [];

  if (subtopics.length === 0) {
    ctx.log.warn('No subtopics to research');
    return;
  }

  ctx.log.info(`Spawning ${subtopics.length} parallel research tasks for epoch ${currentEpoch}`);

  // Spawn a research task for each sub-topic
  for (let i = 0; i < subtopics.length; i++) {
    const subtopic = subtopics[i];
    const subtopicId = subtopic.id || `ST-E${currentEpoch}-${i + 1}`;
    const taskId = `epoch-${currentEpoch}-002-subtopic-${subtopicId}`;

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: relative(ctx.projectDir, join(templatesDir, '002-research-x', 'tasks', '002-subtopic-research', 'templates', 'subtopic-task', 'TASK.md')),
        vars: {
          taskId,
          epoch: currentEpoch,
          subtopicId,
          subtopicName: subtopic.name || subtopic.title || subtopic.topic,
          subtopicDescription: subtopic.description || '',
          question: ctx.vars.question,
          domain: ctx.vars.domain,
          artifactsDir,
          templatesDir,
          maxEpochs: ctx.vars.maxEpochs,
        },
      },
      { id: taskId },
    );
  }

  ctx.log.info(`Spawned ${subtopics.length} sub-topic research tasks for epoch ${currentEpoch}`);
}