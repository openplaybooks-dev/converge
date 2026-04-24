/**
 * WBS After: Epoch Decision Handler
 *
 * Runs AFTER the epoch-decision task completes.
 * Reads the decision and spawns the next research-x epoch if continue=true.
 *
 * Input: {{artifactsDir}}/epoch-{{epoch}}-004-epoch-decision/epoch-decision.json
 * Output: Spawns next research-x epoch (001-subtopic-split for epoch N+1)
 */

import { join, relative } from 'path';
import { readFileSync, existsSync } from 'fs';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const templatesDir = ctx.vars.templatesDir;
  const currentEpoch = parseInt(ctx.vars.epoch ?? '1', 10);
  const maxEpochs = parseInt(ctx.vars.maxEpochs ?? '10', 10);

  // Read the decision from the current epoch
  const decisionPath = join(artifactsDir, `epoch-${currentEpoch}-004-epoch-decision`, 'epoch-decision.json');

  if (!existsSync(decisionPath)) {
    ctx.log.warn(`Decision file not found at ${decisionPath}`);
    return;
  }

  const decision = JSON.parse(readFileSync(decisionPath, 'utf-8'));

  ctx.log.info(`Epoch ${currentEpoch} decision: continue=${decision.continue}, confidence=${decision.confidence}`);

  // Check if we should continue to next epoch
  if (decision.continue !== true) {
    ctx.log.info(`Research stopping: decision.continue=${decision.continue}`);
    return;
  }

  if (currentEpoch >= maxEpochs) {
    ctx.log.info(`Research stopping: reached max epochs (${currentEpoch}/${maxEpochs})`);
    return;
  }

  const nextEpoch = currentEpoch + 1;
  ctx.log.info(`Spawning research-x for epoch ${nextEpoch}`);

  // Spawn the next research-x epoch (starting with subtopic-split)
  const nextEpochTaskId = `research-x-epoch-${nextEpoch}`;
  
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: relative(ctx.projectDir, join(templatesDir, 'research-x', 'TASK.md')),
      vars: {
        taskId: nextEpochTaskId,
        epoch: nextEpoch,
        question: ctx.vars.question,
        domain: ctx.vars.domain,
        artifactsDir,
        templatesDir,
        maxEpochs,
      },
    },
    { id: nextEpochTaskId },
  );

  ctx.log.info(`Spawned research-x epoch ${nextEpoch}`);
}
