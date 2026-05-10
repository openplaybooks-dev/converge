/**
 * Spawn one self-improvement epoch per loop cycle.
 */
import { join, relative, dirname } from 'path';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const artifactsRootRel = join('.converge', 'artifacts', 'self-improvement-loop');
  const artifactsRoot = join(ctx.projectDir, artifactsRootRel);

  // Epoch numbering is based on durable artifact directories, not the transient
  // spawned task directory. This lets bounded follow-up runs continue with
  // epoch-002, epoch-003, ... instead of respawning epoch-001 and hitting
  // output preflight caches.
  let nextEpoch = 1;
  const epochsRoot = join(artifactsRoot, 'epochs');
  if (existsSync(epochsRoot)) {
    const existing = readdirSync(epochsRoot)
      .filter((d) => /^\d+$/.test(d))
      .map((d) => Number(d))
      .filter(Number.isFinite);
    if (existing.length) nextEpoch = Math.max(...existing) + 1;
  }

  const epoch = String(nextEpoch).padStart(3, '0');
  const artifactsRel = join(artifactsRootRel, 'epochs', epoch);
  const artifactsDir = join(ctx.projectDir, artifactsRel);
  mkdirSync(artifactsDir, { recursive: true });

  const epochTemplateDir = join(__dirname, '..', '..', '..', 'templates', 'epoch');
  const templatePath = relative(ctx.projectDir, join(epochTemplateDir, 'TASK.md'));

  await ctx.spawn(
    {
      _type: 'template-ref',
      path: templatePath,
      vars: {
        taskId: `epoch-${epoch}`,
        epoch,
        projectDir: ctx.projectDir,
        artifactsRoot,
        artifactsRootRel,
        artifactsDir,
        artifactsRel,
        epochTemplateDir,
      },
    },
    { id: `epoch-${epoch}` },
  );

  // Continue only after this epoch is complete. The runner will re-queue this
  // parent on the next loop cycle, and playbook.yml bounds the autonomous
  // session with maxIterations/maxDuration/stall settings.
  return ctx.loop.continue();
}
