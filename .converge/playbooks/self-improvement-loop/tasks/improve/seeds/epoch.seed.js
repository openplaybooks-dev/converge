/**
 * Spawn one self-improvement epoch per loop cycle.
 */
import { join, relative, dirname } from 'path';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Normalize Windows backslashes to forward slashes so path values don't break
 * YAML parsing when substituted into template frontmatter. In double-quoted
 * YAML strings, \a, \s, \b etc. are interpreted as escape sequences.
 */
const fwd = (p) => p.replace(/\\/g, '/');

export async function run(ctx) {
  const artifactsRootRel = fwd(join('.converge', 'artifacts', 'self-improvement-loop'));
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
  const artifactsRel = fwd(join(artifactsRootRel, 'epochs', epoch));
  const artifactsDir = join(ctx.projectDir, artifactsRel);

  const epochTemplateDir = join(__dirname, '..', '..', '..', 'templates', 'epoch');
  const templatePath = relative(ctx.projectDir, join(epochTemplateDir, 'TASK.md'));

  await ctx.spawn(
    {
      _type: 'template-ref',
      path: fwd(templatePath),
      vars: {
        taskId: `epoch-${epoch}`,
        epoch,
        projectDir: fwd(ctx.projectDir),
        artifactsRoot: fwd(artifactsRoot),
        artifactsRootRel: fwd(artifactsRootRel),
        artifactsDir: fwd(artifactsDir),
        artifactsRel: fwd(artifactsRel),
        epochTemplateDir: fwd(epochTemplateDir),
      },
    },
    { id: `epoch-${epoch}` },
  );

  // Create the artifacts directory only after a successful spawn.
  // If the spawn fails, no stub directory is left behind and the
  // epoch number is correctly reused on the next cycle.
  mkdirSync(artifactsDir, { recursive: true });

  // Continue only after this epoch is complete. The runner will re-queue this
  // parent on the next loop cycle, and playbook.yml bounds the autonomous
  // session with maxIterations/maxDuration/stall settings.
  return ctx.loop.continue();
}
