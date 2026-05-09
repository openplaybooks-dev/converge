/**
 * Epoch seed — spawns the next epoch from the epoch template.
 *
 * Tracks existing epochs via ctx.spawnDir (the journal directory
 * where spawned children are written). Each converge run invocation
 * spawns one epoch.
 */
import { join, relative, dirname } from 'path';
import { readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  // Count existing epochs from ctx.spawnDir
  let nextEpoch = 1;
  if (existsSync(ctx.spawnDir)) {
    const existing = readdirSync(ctx.spawnDir)
      .filter(d => d.startsWith('epoch-'))
      .map(d => parseInt(d.replace('epoch-', ''), 10))
      .filter(n => !isNaN(n));
    if (existing.length > 0) {
      nextEpoch = Math.max(...existing) + 1;
    }
  }

  const epochStr = String(nextEpoch).padStart(3, '0');
  const artifactsDir = join(ctx.projectDir, '.converge', 'artifacts', 'self-improvement-loop', 'epochs', epochStr);
  const epochTemplateDir = join(__dirname, 'epoch', 'templates', 'epoch');

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
