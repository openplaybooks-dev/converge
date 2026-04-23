/**
 * WBS: Layer 3 — Phase Spawner
 *
 * Spawns 4 phases in sequence:
 *   001-critical-investigation   → investigate critical areas
 *   002-reasoning-chains         → trace and verify reasoning chains
 *   003-comprehensive-synthesis   → build comprehensive understanding
 *   004-aggregation               → definitive synthesis
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const layer = ctx.vars.layer;
  const artifactsDir = ctx.vars.artifactsDir;
  const layerTemplateDir = ctx.vars.layerTemplateDir;

  const phases = [
    ['001', 'critical-investigation'],
    ['002', 'reasoning-chains'],
    ['003', 'comprehensive-synthesis'],
    ['004', 'aggregation'],
  ];

  const taskIds = [];
  for (const [prefix, phase] of phases) {
    const taskId = `${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(layerTemplateDir, 'tasks', phase, 'TASK.md'));

    const deps = taskIds.length > 0 ? [taskIds[taskIds.length - 1]] : [];

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, layer, projectDir: ctx.projectDir,
        artifactsDir, layerTemplateDir,
        question: ctx.vars.question,
        domain: ctx.vars.domain,
        contradictionTriggers: ctx.vars.contradictionTriggers ?? [],
      }},
      { id: taskId, dependencies: deps },
    );
    taskIds.push(taskId);
  }
}