/**
 * DoD: Scientific Rigor Evaluator
 *
 * Uses the DodRunner Jest-like API to verify research quality.
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
  const findings = readJSON('known-findings.json');
  const hypotheses = readJSON('hypotheses.json');
  const evidence = readJSON('evidence.json');
  const hasSynthesis = existsSync('synthesis.md');
  const hasLitReview = existsSync('literature-review.md');

  // Report data for dashboard
  ctx.data('hasLiteratureReview', hasLitReview);
  ctx.data('findingsCount', findings?.findings?.length ?? 0);
  ctx.data('hypothesesCount', hypotheses?.hypotheses?.length ?? 0);
  ctx.data('claimsCount', evidence?.claims?.length ?? 0);
  ctx.data('hasSynthesis', hasSynthesis);

  const untestedHypotheses = evidence?.hypotheses?.filter((h) => !h.tested) ?? [];
  const unbackedClaims = evidence?.claims?.filter(
    (c) => !c.sources || c.sources.length === 0,
  ) ?? [];
  const unresolvedContradictions = evidence?.contradictions?.filter(
    (c) => !c.resolved,
  ) ?? [];

  ctx.data('untestedHypotheses', untestedHypotheses.length);
  ctx.data('unbackedClaims', unbackedClaims.length);
  ctx.data('unresolvedContradictions', unresolvedContradictions.length);

  ctx.describe('Scientific rigor', () => {
    ctx.it('has literature review with adequate sources', () => {
      ctx.expect(hasLitReview).toBeTruthy();
      ctx.expect(findings).toBeTruthy();
      ctx.expect(findings.findings.length).toBeGreaterThan(0);
    });

    ctx.it('has testable hypotheses formulated', () => {
      ctx.expect(hypotheses).toBeTruthy();
      ctx.expect(hypotheses.hypotheses.length).toBeGreaterThan(0);
      for (const h of hypotheses.hypotheses) {
        ctx.expect(h.testable).toBeTruthy();
      }
    });

    ctx.it('all hypotheses have been tested', () => {
      ctx.expect(evidence).toBeTruthy();
      ctx.expect(evidence.hypotheses).toBeTruthy();
      ctx.expect(untestedHypotheses.length).toBe(0);
    });

    ctx.it('all claims are backed by evidence', () => {
      ctx.expect(evidence).toBeTruthy();
      ctx.expect(evidence.claims).toBeTruthy();
      ctx.expect(unbackedClaims.length).toBe(0);
    });

    ctx.it('no unresolved contradictions remain', () => {
      ctx.expect(evidence).toBeTruthy();
      // Contradictions array may not exist if there are none — that's fine
      ctx.expect(unresolvedContradictions.length).toBe(0);
    });

    ctx.it('synthesis document addresses the research question', () => {
      ctx.expect(hasSynthesis).toBeTruthy();
      const synthesis = readFileSync('synthesis.md', 'utf-8');
      ctx.expect(synthesis.length).toBeGreaterThan(100);
    });
  });
}
