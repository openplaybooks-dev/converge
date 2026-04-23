/**
 * WBS: Epoch Pipeline — 8-phase scientific research
 *
 *   001-literature              → literature search + prior state
 *   002-hypothesize             → Bayesian hypothesis formulation
 *   003-experiment              → WBS parent: per-hypothesis experiments
 *   004-statistical-analysis    → effect sizes, CIs, meta-analysis
 *   005-evidence-synthesis      → GRADE methodology assessment
 *   006-contradiction-resolution → systematic conflict resolution
 *   007-paper-draft             → WBS parent: per-section academic paper
 *   008-convergence-check       → quality scoring, continue/stop
 */

import { join, relative } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const epochTemplateDir = ctx.vars.epochTemplateDir;

  for (const [prefix, phase] of [
    ['001', 'literature'],
    ['002', 'hypothesize'],
    ['003', 'experiment'],
    ['004', 'statistical-analysis'],
    ['005', 'evidence-synthesis'],
    ['006', 'contradiction-resolution'],
    ['007', 'paper-draft'],
    ['008', 'convergence-check'],
  ]) {
    const taskId = `${prefix}-${phase}`;
    const templatePath = relative(ctx.projectDir,
      join(epochTemplateDir, 'tasks', phase, 'TASK.md'));

    await ctx.spawn(
      { _type: 'template-ref', path: templatePath, vars: {
        taskId, epoch, projectDir, artifactsDir, epochTemplateDir,
        question: ctx.vars.question,
        domain: ctx.vars.domain,
        targetScore: ctx.vars.targetScore,
      }},
      { id: taskId },
    );
  }
}
