/**
 * DoD: LLM Training Configuration Convergence
 *
 * Uses the DodRunner Jest-like API to verify optimization convergence.
 * Metric value = count of failed tests (0 = all pass = converged).
 */

import { readFileSync, existsSync } from 'node:fs';

function readJSON(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export async function run(ctx) {
  const state = readJSON('evolution-state.json');
  const best = readJSON('best-candidate.json');
  const hasReport = existsSync('optimization-report.md');

  const fitnessThreshold = parseFloat(ctx.inputs?.fitnessThreshold ?? '0.9');

  // Report data for dashboard
  ctx.data('generation', state?.generation ?? 0);
  ctx.data('bestFitness', best?.fitness ?? 0);
  ctx.data('fitnessThreshold', fitnessThreshold);
  ctx.data('bestCandidateId', best?.candidateId ?? 'none');
  ctx.data('hasReport', hasReport);
  ctx.data('hasArchitecture', !!best?.specification?.architecture);
  ctx.data('hasHyperparameters', !!best?.specification?.hyperparameters);
  ctx.data('hasDataStrategy', !!best?.specification?.dataStrategy);

  ctx.describe('Training configuration convergence', () => {
    ctx.it('at least one generation has been evaluated', () => {
      ctx.expect(state).toBeTruthy();
      ctx.expect(state.generation).toBeGreaterThan(0);
    });

    ctx.it('best configuration fitness meets threshold', () => {
      ctx.expect(best).toBeTruthy();
      ctx.expect(typeof best.fitness).toBe('number');
      ctx.expect(best.fitness >= fitnessThreshold).toBeTruthy();
    });

    ctx.it('best configuration has complete specification', () => {
      ctx.expect(best).toBeTruthy();
      ctx.expect(best.specification).toBeTruthy();
      ctx.expect(best.specification.architecture).toBeTruthy();
      ctx.expect(best.specification.hyperparameters).toBeTruthy();
      ctx.expect(best.specification.dataStrategy).toBeTruthy();
    });

    ctx.it('training recipe report has been generated', () => {
      ctx.expect(hasReport).toBeTruthy();
      const report = readFileSync('optimization-report.md', 'utf-8');
      ctx.expect(report.length).toBeGreaterThan(100);
    });
  });
}
