/**
 * WBS: Recursive Sub-subtopic Spawner
 *
 * Reads decomposition decision and spawns sub-subtopics recursively using the SAME parent template.
 * This enables unlimited depth of research decomposition.
 */

import { join, relative } from 'path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  
  // TEMPORARY: Hardcode values until framework variable passing is fixed
  const artifactsDir = join(projectDir, '.converge', 'artifacts', 'deep-research');
  const templatesDir = join(projectDir, '.converge', 'playbooks', 'deep-research', 'wbs', 'templates');
  const question = ctx.vars.question || "What are the main causes of climate change?";
  const domain = ctx.vars.domain || "environmental science";
  const maxEpochs = ctx.vars.maxEpochs || "10";
  const epoch = parseInt(ctx.vars.epoch || '1', 10);
  const subtopicId = ctx.vars.subtopicId;
  const subtopicName = ctx.vars.subtopicName;

  ctx.log.info(`Checking decomposition for subtopic: ${subtopicName} (${subtopicId})`);

  // Read decomposition decision
  const decompositionPath = join(artifactsDir, '2-research', `${subtopicId}-decompose.json`);

  if (!existsSync(decompositionPath)) {
    ctx.log.warn(`No decomposition file found at ${decompositionPath} - creating marker and spawning no-op task`);

    // Create marker file to satisfy check
    const markerDir = join(artifactsDir, '2-research');
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(
      join(markerDir, `${subtopicId}-spawned.json`),
      JSON.stringify({ spawned: false, reason: 'No decomposition file' }, null, 2)
    );

    // Spawn a no-op task to satisfy WBS requirement
    await ctx.spawn({
      _type: 'inline',
      id: 'no-decomposition-needed',
      title: 'No Decomposition Needed',
      description: 'Decomposition file not found - no sub-subtopics to spawn',
    });
    return;
  }

  const decomposition = JSON.parse(readFileSync(decompositionPath, 'utf-8'));

  if (!decomposition.shouldDecompose) {
    ctx.log.info(`Subtopic ${subtopicId} does not need decomposition`);

    // Create marker file
    const markerDir = join(artifactsDir, '2-research');
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(
      join(markerDir, `${subtopicId}-spawned.json`),
      JSON.stringify({
        spawned: false,
        reason: decomposition.rationale,
        subtopicId,
        subtopicName
      }, null, 2)
    );

    // Spawn a no-op task to satisfy WBS requirement
    await ctx.spawn({
      _type: 'inline',
      id: 'no-decomposition-needed',
      title: 'No Decomposition Needed',
      description: `${subtopicName} does not require further decomposition: ${decomposition.rationale}`,
    });
    return;
  }

  const subSubtopics = decomposition.subSubtopics || [];

  if (subSubtopics.length === 0) {
    ctx.log.warn(`Decomposition says to decompose but no sub-subtopics defined`);

    // Create marker file
    const markerDir = join(artifactsDir, '2-research');
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(
      join(markerDir, `${subtopicId}-spawned.json`),
      JSON.stringify({ spawned: false, reason: 'No sub-subtopics defined' }, null, 2)
    );

    // Spawn a no-op task to satisfy WBS requirement
    await ctx.spawn({
      _type: 'inline',
      id: 'no-subtopics-defined',
      title: 'No Sub-subtopics Defined',
      description: 'Decomposition requested but no sub-subtopics were defined',
    });
    return;
  }

  ctx.log.info(`Spawning ${subSubtopics.length} sub-subtopics for ${subtopicId}`);

  // Spawn each sub-subtopic using the SAME parent template (recursive!)
  for (const subSubtopic of subSubtopics) {
    const subSubtopicId = subSubtopic.id;
    const subSubtopicName = subSubtopic.name || subSubtopic.subtopic;
    const subSubtopicDescription = subSubtopic.description || '';

    ctx.log.info(`Spawning sub-subtopic: ${subSubtopicName} (${subSubtopicId})`);

    // Use the SAME template as the parent - this is the key to recursion!
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: relative(projectDir, join(templatesDir, '002-research-x', 'tasks', '002-subtopic-research', 'templates', 'subtopic-task', 'TASK.md')),
        vars: {
          taskId: `epoch-${epoch}-${subSubtopicId}`,
          epoch,
          subtopicId: subSubtopicId,
          subtopicName: subSubtopicName,
          subtopicDescription: subSubtopicDescription,
          question,
          domain,
          artifactsDir,
          templatesDir,
          maxEpochs,
        },
      },
      { id: `epoch-${epoch}-${subSubtopicId}` },
    );
  }

  // Create marker file indicating successful spawn
  const markerDir = join(artifactsDir, '2-research');
  mkdirSync(markerDir, { recursive: true });
  writeFileSync(
    join(markerDir, `${subtopicId}-spawned.json`),
    JSON.stringify({
      spawned: true,
      count: subSubtopics.length,
      subSubtopics: subSubtopics.map(s => ({ id: s.id, name: s.name })),
      subtopicId,
      subtopicName
    }, null, 2)
  );

  ctx.log.info(`Successfully spawned ${subSubtopics.length} sub-subtopics for ${subtopicId}`);
}
