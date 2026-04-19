/**
 * WBS: Execute todos
 *
 * Reads the implementation plan and spawns one subtask per step.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

export async function run(ctx) {
  const epoch = ctx.vars.epoch;
  const projectDir = ctx.vars.projectDir;
  const artifactsDir = ctx.vars.artifactsDir;
  const planPath = join(artifactsDir, 'implement', 'plan.json');

  const plan = JSON.parse(await readFile(planPath, 'utf8'));

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const prefix = String(i + 1).padStart(3, '0');
    const taskId = `${prefix}-todo`;

    const body = [
      `# ${step.description}`,
      '',
      `**File:** \`${step.file}\``,
      '',
      step.details,
      '',
      '## Rules',
      '',
      '- Make only the change described above',
      '- Don\'t suppress errors with `any` or `@ts-ignore`',
      '- Don\'t refactor unrelated code',
    ].join('\n');

    await ctx.spawn(
      { _type: 'raw-markdown', content: body },
      { id: taskId },
    );
  }
}
