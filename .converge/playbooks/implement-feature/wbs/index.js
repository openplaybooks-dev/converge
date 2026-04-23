/**
 * WBS: Task Dispatcher
 *
 * Spawns a new task from the item template into sibling tasks/ folder.
 * Called by --add to incrementally add tasks.
 */

import { join, relative, dirname } from 'path';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const task = ctx.vars.task || 'unknown task';

  // Determine next numeric prefix from tasks/ sibling
  const tasksDir = join(__dirname, '..', 'tasks');
  let nextNum = 1;
  if (existsSync(tasksDir)) {
    const existing = readdirSync(tasksDir)
      .filter(d => d.match(/^\d+-/))
      .map(d => parseInt(d.split('-')[0], 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      nextNum = Math.max(...existing) + 1;
    }
  }

  const prefix = String(nextNum).padStart(3, '0');
  const slug = task
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  const taskId = `${prefix}-${slug}`;
  const templatePath = relative(ctx.projectDir,
    join(__dirname, 'templates', 'item', 'TASK.md'));

  const artifactsDir = join(ctx.projectDir, '.converge', 'artifacts', 'do', taskId);

  await ctx.spawn(
    { _type: 'template-ref', path: templatePath, vars: {
      taskId,
      task,
      projectDir: ctx.projectDir,
      artifactsDir,
    }},
    { id: taskId },
  );
}
