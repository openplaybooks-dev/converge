/**
 * Simulate WBS: spawn one task per persona for this tick.
 *
 * Reads runs/{runId}/personas.json and emits ctx.spawn() per persona,
 * passing this tick number + the persona's id/handle/bio so the persona's
 * task prompt has everything it needs.
 */

import { readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const runId = ctx.vars.runId;
  const tick = ctx.vars.tick;
  const personasPath = join(ctx.projectDir, 'runs', runId, 'personas.json');

  let personas;
  try {
    personas = JSON.parse(readFileSync(personasPath, 'utf-8'));
  } catch (err) {
    throw new Error(
      `simulate WBS: cannot read ${personasPath} — did 010-setup run? (${err.message})`,
    );
  }
  if (!Array.isArray(personas) || personas.length === 0) {
    throw new Error(`simulate WBS: personas.json must be a non-empty array`);
  }

  const personaTemplate = relative(
    ctx.projectDir,
    join(__dirname, 'templates', 'persona', 'TASK.md'),
  );

  for (const p of personas) {
    if (!p.id) continue;
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: personaTemplate,
        vars: {
          taskId: p.id,
          tick,
          tickNum: ctx.vars.tickNum,
          runId,
          scenario: ctx.vars.scenario,
          recommender: ctx.vars.recommender,
          populationSize: ctx.vars.populationSize,
          steps: ctx.vars.steps,
          seed: ctx.vars.seed,
          personaId: p.id,
          personaHandle: p.handle ?? p.id,
          personaBio: p.bio ?? '',
          action: '',
        },
      },
      { id: p.id },
    );
  }
}
