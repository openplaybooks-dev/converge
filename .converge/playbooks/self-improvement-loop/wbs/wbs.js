/**
 * WBS: Improve Converge Framework
 *
 * Finds the next epoch number by scanning existing epoch task directories,
 * then spawns a new epoch. Each `converge run improve` invocation runs
 * one epoch.
 */

import { join, relative, dirname } from 'path';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  // Seeded children go under the parent directory's `tasks/` folder
  const parentDir = join(__dirname, '..');
  const tasksDir = join(parentDir, 'tasks');

  // Find next epoch number by looking at existing epoch-NNN folders
  let nextEpoch = 1;
  if (existsSync(tasksDir)) {
    const existing = readdirSync(tasksDir)
      .filter(d => d.startsWith('epoch-'))
      .map(d => parseInt(d.replace('epoch-', ''), 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      nextEpoch = Math.max(...existing) + 1;
    }
  }

  const epochStr = String(nextEpoch).padStart(3, '0');
  const artifactsDir = join(ctx.projectDir, '.converge', 'artifacts', 'self-improvement-loop', 'epochs', epochStr);
  const epochTemplateDir = join(__dirname, 'templates', 'epoch');

  const epochId = `epoch-${epochStr}`;
  const templatePath = relative(ctx.projectDir,
    join(epochTemplateDir, 'TASK.md'));

  await ctx.spawn(
    { _type: 'template-ref', path: templatePath, vars: {
      taskId: epochId, epoch: epochStr, projectDir: ctx.projectDir,
      artifactsDir, epochTemplateDir,
    }},
    { id: epochId },
  );
}
