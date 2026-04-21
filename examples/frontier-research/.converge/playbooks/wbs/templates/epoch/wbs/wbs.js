/**
 * WBS: Epoch Pipeline — 6-phase beam-search research
 *
 *   001-frontier-analysis    → map knowledge frontier
 *   002-beam-spawning        → define N parallel beams
 *   003-beam-execution       → WBS parent: per-beam exploration
 *   004-beam-scoring         → WBS parent: per-beam scoring
 *   005-selection-merge      → select top-K, merge insights
 *   006-gradient-step        → update knowledge model, convergence decision
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const epochTemplateDir = ctx.vars.epochTemplateDir;

  for (const [prefix, phase] of [
    ['001', 'frontier-analysis'],
    ['002', 'beam-spawning'],
    ['003', 'beam-execution'],
    ['004', 'beam-scoring'],
    ['005', 'selection-merge'],
    ['006', 'gradient-step'],
  ]) {
    const taskId = `${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(epochTemplateDir, 'tasks', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, epoch, projectDir, artifactsDir, epochTemplateDir,
        question: ctx.vars.question,
        domain: ctx.vars.domain,
        beamWidth: ctx.vars.beamWidth,
        selectionWidth: ctx.vars.selectionWidth,
        convergenceThreshold: ctx.vars.convergenceThreshold,
      }},
      { id: taskId },
    );
  }
}
