/**
 * Evidence Quality Validator
 *
 * Deterministic check (not AI) that validates evidence.json:
 * - Every claim has a sources array (no unbacked claims)
 * - No unresolved contradictions
 * - All hypotheses have a test result
 * - Minimum evidence threshold met
 *
 * Exit code 0 = pass, 1 = fail with description on stderr.
 */

import { readFileSync, existsSync } from 'node:fs';

const errors = [];

// Check evidence.json exists
if (!existsSync('evidence.json')) {
  console.error('evidence.json not found');
  process.exit(1);
}

let evidence;
try {
  evidence = JSON.parse(readFileSync('evidence.json', 'utf-8'));
} catch (e) {
  console.error(`evidence.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

// Check: every claim has sources
if (evidence.claims && Array.isArray(evidence.claims)) {
  const unbacked = evidence.claims.filter(
    (c) => !c.sources || !Array.isArray(c.sources) || c.sources.length === 0,
  );
  if (unbacked.length > 0) {
    errors.push(
      `${unbacked.length} claim(s) without sources: ${unbacked.map((c) => c.claim).join('; ')}`,
    );
  }
} else {
  errors.push('evidence.json missing claims array');
}

// Check: no unresolved contradictions
if (evidence.contradictions && Array.isArray(evidence.contradictions)) {
  const unresolved = evidence.contradictions.filter((c) => !c.resolved);
  if (unresolved.length > 0) {
    errors.push(
      `${unresolved.length} unresolved contradiction(s): ${unresolved.map((c) => `"${c.claim1}" vs "${c.claim2}"`).join('; ')}`,
    );
  }
}

// Check: all hypotheses tested
if (evidence.hypotheses && Array.isArray(evidence.hypotheses)) {
  const untested = evidence.hypotheses.filter((h) => !h.tested);
  if (untested.length > 0) {
    errors.push(
      `${untested.length} untested hypothesis(es): ${untested.map((h) => h.id).join(', ')}`,
    );
  }
} else {
  errors.push('evidence.json missing hypotheses array');
}

// Check: minimum evidence threshold
if (evidence.claims && evidence.claims.length === 0) {
  errors.push('No claims in evidence — insufficient evidence');
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Evidence quality check passed');
process.exit(0);
