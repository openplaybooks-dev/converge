/**
 * WBS: Analyze codebase
 *
 * Spawns parallel analysis subtasks + a final prioritize task:
 *   001-health        → concrete metrics and project health data
 *   001-architecture  → strategic architecture analysis
 *   001-dx            → developer experience analysis
 *   002-prioritize    → pick the best improvement from all analyses
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const epochTemplateDir = ctx.vars.epochTemplateDir;
  const analyzeTemplateDir = join(epochTemplateDir, 'tasks', 'analyze');

  // Parallel analysis subtasks (all prefix 001)
  const analyses = ['health', 'architecture', 'dx'];
  for (const phase of analyses) {
    const taskId = `001-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(analyzeTemplateDir, 'tasks', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, epoch, projectDir, artifactsDir,
      }},
      { id: taskId },
    );
  }

  // Final: pick the best issue
  const prioritizeId = '002-prioritize';
  const prioritizePath = relative(ctx.projectDir,
    join(analyzeTemplateDir, 'tasks', 'prioritize', 'TASK.md'));

  await ctx.spawn(
    { _type: 'template-ref', path: prioritizePath, vars: {
      taskId: prioritizeId, epoch, projectDir, artifactsDir,
    }},
    { id: prioritizeId },
  );
}
