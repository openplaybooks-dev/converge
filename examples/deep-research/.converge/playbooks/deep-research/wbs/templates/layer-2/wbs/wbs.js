/**
 * WBS: Layer 2 — Phase Spawner
 *
 * Spawns 4 phases in sequence:
 *   001-deep-dive-areas   → investigate each promising area
 *   002-cross-analysis    → cross-source analysis within each area
 *   003-compare-findings  → compare findings across areas
 *   004-aggregation       → first-class aggregation phase
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const layer = ctx.vars.layer;
  const artifactsDir = ctx.vars.artifactsDir;
  const layerTemplateDir = ctx.vars.layerTemplateDir;

  const phases = [
    ['001', 'deep-dive-areas'],
    ['002', 'cross-analysis'],
    ['003', 'compare-findings'],
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
        insightTriggers: ctx.vars.insightTriggers ?? [],
      }},
      { id: taskId, dependencies: deps },
    );
    taskIds.push(taskId);
  }
}