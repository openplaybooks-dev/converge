/**
 * WBS: Improve Converge Framework
 *
 * Each epoch spawns a single epoch folder that contains the full pipeline.
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const epoch = ctx.vars.epoch || '1';
  const epochStr = String(epoch).padStart(3, '0');
  const artifactsDir = join(ctx.projectDir, '.converge', 'artifacts', 'improve', 'epochs', epochStr);
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
