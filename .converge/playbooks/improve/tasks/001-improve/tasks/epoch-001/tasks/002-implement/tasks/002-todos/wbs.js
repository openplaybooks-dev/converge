/**
 * WBS: Execute todos
 *
 * Reads the implementation plan (markdown) and spawns one subtask per step.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

export async function run(ctx) {
  const artifactsDir = ctx.vars.artifactsDir;
  const planPath = join(artifactsDir, 'implement', 'plan.md');

  const planMd = await readFile(planPath, 'utf8');

  // Parse steps from markdown: each ### step-NNN heading is a step
  const stepRegex = /^### (step-\d+)\s*\n([\s\S]*?)(?=\n### step-|\n## |$)/gm;
  const steps = [];
  let match;
  while ((match = stepRegex.exec(planMd)) !== null) {
    const id = match[1];
    const body = match[2].trim();
    // Extract fields from bullet list
    const file = body.match(/\*\*File:\*\*\s*`([^`]+)`/)?.[1] || '';
    const description = body.match(/\*\*Description:\*\*\s*(.*)/)?.[1] || id;
    const details = body.match(/\*\*Details:\*\*\s*(.*)/)?.[1] || '';
    steps.push({ id, file, description, details });
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
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
