/**
 * WBS: Todos — spawn one task per implementation step.
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const planPath = join(artifactsDir, 'implement', 'plan.md');

  if (!existsSync(planPath)) {
    await ctx.spawn({
      id: '001-execute',
      title: `Execute: ${ctx.vars.task}`,
      body: `Implement the task: ${ctx.vars.task}\n\nRead the analysis at \`${artifactsDir}/analyze/plan.md\` and execute it.`,
    }, { id: '001-execute' });
    return;
  }

  const plan = readFileSync(planPath, 'utf-8');

  // Extract numbered steps from ## Changes or ## Order of Operations
  const lines = plan.split('\n');
  const steps = [];
  let inSection = false;

  for (const line of lines) {
    if (line.match(/^##\s+(Changes|Order of Operations|Steps)/)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) break;
    if (inSection) {
      const match = line.match(/^\d+\.\s+(.+)/);
      if (match) steps.push(match[1].trim());
    }
  }

  if (steps.length === 0) {
    await ctx.spawn({
      id: '001-execute',
      title: `Execute: ${ctx.vars.task}`,
      body: `Implement the task based on:\n\n${plan}`,
    }, { id: '001-execute' });
    return;
  }

  for (let i = 0; i < steps.length; i++) {
    const num = String(i + 1).padStart(3, '0');
    const stepId = `${num}-step`;
    await ctx.spawn({
      id: stepId,
      title: `Step ${i + 1}: ${steps[i].slice(0, 80)}`,
      body: `Execute this step:\n\n${steps[i]}\n\nFull plan context:\n${plan}`,
    }, { id: stepId });
  }
}
