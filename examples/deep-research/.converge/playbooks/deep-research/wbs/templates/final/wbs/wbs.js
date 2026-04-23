/**
 * WBS: Final Report — Section Spawner
 *
 * Spawns the final report generation task that synthesizes all layers.
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;

  // Spawn single final report task that synthesizes all layers
  await ctx.spawn(
    { _type: 'template-ref', path: relative(ctx.projectDir,
      join(ctx.vars.templatesDir, 'final', 'tasks', 'final-report', 'TASK.md')),
      vars: {
        taskId: 'final-report-generate',
        projectDir: ctx.projectDir,
        artifactsDir,
        question: ctx.vars.question,
        domain: ctx.vars.domain,
      }},
    { id: 'final-report-generate' },
  );
}