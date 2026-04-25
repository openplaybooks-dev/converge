/**
 * Root WBS: spawn all `steps` epoch tasks at once.
 *
 * Ordering between ticks comes from the epoch template's `dependencies:`
 * field — epoch-002 depends on epoch-001/030-analyze, etc. This avoids the
 * loop-mode reseeding bug: converge mode runs the root WBS exactly once,
 * spawns N children, then walks the dep graph in order.
 */

import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const runId = ctx.vars?.runId ?? 'run-001';
  const steps = parseInt(String(ctx.vars?.steps ?? '3'), 10);
  const epochTemplateDir = join(__dirname, 'templates', 'epoch');
  const templatePath = relative(
    ctx.projectDir,
    join(epochTemplateDir, 'TASK.md'),
  );

  for (let t = 1; t <= steps; t++) {
    const tickStr = String(t).padStart(3, '0');
    const epochId = `epoch-${tickStr}`;
    const prevEpochId = t > 1 ? `epoch-${String(t - 1).padStart(3, '0')}` : '';

    await ctx.spawn(
      {
        _type: 'template-ref',
        path: templatePath,
        vars: {
          taskId: epochId,
          tick: tickStr,
          tickNum: String(t),
          runId,
          scenario: ctx.vars?.scenario ?? 'misinfo',
          populationSize: String(ctx.vars?.populationSize ?? '10'),
          steps: String(steps),
          recommender: ctx.vars?.recommender ?? 'hot-score',
          seedPosts: String(ctx.vars?.seedPosts ?? '1'),
          seed: String(ctx.vars?.seed ?? '42'),
          // Empty for tick 1 (no predecessor); set to prior-epoch's analyze
          // task otherwise. Empty deps → no `depends_on:` line in the
          // rendered TASK.md (the template uses {{prevAnalyzeDep}}).
          prevAnalyzeDep: prevEpochId
            ? `${prevEpochId}/030-analyze`
            : '',
          epochTemplateDir,
        },
      },
      { id: epochId },
    );
  }
}
