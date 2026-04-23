/**
 * WBS: Todos — spawn one task per step in implement/plan.md.
 *
 * Parses numbered items under "## Changes" / "## Order of Operations" / "## Steps".
 * Falls back to a single all-in-one step if the plan doesn't exist or has no numbered steps.
 */

import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

export async function run(ctx) {
  const { task, spec, artifactsDir } = ctx.vars;
  const planPath = join(artifactsDir, 'implement', 'plan.md');

  if (!existsSync(planPath)) {
    await ctx.spawn(
      {
        id: '001-execute',
        title: `Execute: ${task}`,
        body: `Implement the PR.\n\n**Summary:** ${task}\n\n**Spec:**\n${spec}\n\n**Analysis:** \`${artifactsDir}/analyze/plan.md\``,
      },
      { id: '001-execute' },
    );
    return;
  }

  const plan = readFileSync(planPath, 'utf-8');

  const lines = plan.split('\n');
  const steps = [];
  let inSection = false;

  for (const line of lines) {
    if (line.match(/^##\s+(Changes|Order of Operations|Steps)/)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith('## ')) {
      inSection = false;
      continue;
    }
    if (inSection) {
      const match = line.match(/^\d+\.\s+(.+)/);
      if (match) steps.push(match[1].trim());
    }
  }

  if (steps.length === 0) {
    await ctx.spawn(
      {
        id: '001-execute',
        title: `Execute: ${task}`,
        body: `Execute the plan.\n\n**Summary:** ${task}\n\n**Full plan:**\n${plan}`,
      },
      { id: '001-execute' },
    );
    return;
  }

  for (let i = 0; i < steps.length; i++) {
    const num = String(i + 1).padStart(3, '0');
    const stepId = `${num}-step`;
    await ctx.spawn(
      {
        id: stepId,
        title: `Step ${i + 1}: ${steps[i].slice(0, 80)}`,
        body: `Execute this step:\n\n${steps[i]}\n\nFull plan context:\n${plan}`,
      },
      { id: stepId },
    );
  }
}
