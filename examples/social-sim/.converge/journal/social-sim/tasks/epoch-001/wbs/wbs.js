/**
 * Epoch WBS: spawn the three phase children for this tick.
 *
 *   010-setup     → ensure persona/graph state exists
 *   020-simulate  → spawns N persona tasks (one per persona)
 *   030-analyze   → per-tick metrics + report append
 *
 * Ordering is enforced by `dependencies:` declared in each spawned child's
 * TASK.md frontmatter, NOT by the order of spawn() calls.
 */

import { join, relative } from 'path';

export async function run(ctx) {
  // epochTemplateDir already points to the playbook templates dir (set by root WBS).
  // Use it directly instead of computing from __dirname (which is the journal task dir).
  const epochTemplateDir = ctx.vars.epochTemplateDir;
  const childTemplatesDir = join(epochTemplateDir, 'tasks');

  const sharedVars = {
    tick: ctx.vars.tick,
    tickNum: ctx.vars.tickNum,
    runId: ctx.vars.runId,
    scenario: ctx.vars.scenario,
    populationSize: ctx.vars.populationSize,
    steps: ctx.vars.steps,
    recommender: ctx.vars.recommender,
    seedPosts: ctx.vars.seedPosts,
    seed: ctx.vars.seed,
    epochTemplateDir,
  };

  // Cross-epoch ordering: tick N's setup waits for tick N-1's analyze.
  // The root WBS passes `prevAnalyzeDep` as e.g. "epoch-001/030-analyze"
  // (or "" for tick 1). The setup template renders this as a full YAML
  // dependencies block. For tick 1 we emit `dependencies: []` (no parent).
  const prevAnalyzeDep = ctx.vars.prevAnalyzeDep ?? '';
  const setupDependsBlock = prevAnalyzeDep
    ? `dependencies:\n  - ${prevAnalyzeDep}`
    : 'dependencies: []';

  for (const phase of ['010-setup', '020-simulate', '030-analyze']) {
    const templatePath = relative(
      ctx.projectDir,
      join(childTemplatesDir, phase, 'TASK.md'),
    );
    const phaseVars = {
      ...sharedVars,
      taskId: phase,
      ...(phase === '010-setup' ? { setupDependsBlock } : {}),
    };
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: phaseVars,
      },
      { id: phase },
    );
  }
}
