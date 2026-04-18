/**
 * Score Format Validator for LLM Training Configurations
 *
 * Validates that a scored candidate JSON file has:
 * - fitness: number between 0 and 1
 * - scores: object with benchmarkPotential, trainingEfficiency, scalingProperties, robustness
 * - strengths: non-empty array
 * - weaknesses: non-empty array
 *
 * Exit code 0 = pass, 1 = fail with description on stderr.
 */

import { readFileSync, readdirSync } from 'node:fs';

const errors = [];

// Find scored per-candidate files (exclude consolidated gen-N.json)
let scoredFiles;
try {
  scoredFiles = readdirSync('scored').filter(
    (f) => f.endsWith('.json') && !f.match(/^gen-\d+\.json$/),
  );
} catch {
  console.error('scored/ directory not found');
  process.exit(1);
}

if (scoredFiles.length === 0) {
  console.error('No scored candidate files found');
  process.exit(1);
}

for (const file of scoredFiles) {
  let score;
  try {
    score = JSON.parse(readFileSync(`scored/${file}`, 'utf-8'));
  } catch (e) {
    errors.push(`${file}: not valid JSON — ${e.message}`);
    continue;
  }

  if (typeof score.fitness !== 'number' || score.fitness < 0 || score.fitness > 1) {
    errors.push(`${file}: fitness must be a number between 0 and 1, got ${score.fitness}`);
  }

  if (!score.scores || typeof score.scores !== 'object') {
    errors.push(`${file}: missing scores object`);
  } else {
    for (const key of ['benchmarkPotential', 'trainingEfficiency', 'scalingProperties', 'robustness']) {
      if (typeof score.scores[key] !== 'number') {
        errors.push(`${file}: missing or invalid scores.${key}`);
      }
    }
  }

  if (!Array.isArray(score.strengths) || score.strengths.length === 0) {
    errors.push(`${file}: strengths must be a non-empty array`);
  }

  if (!Array.isArray(score.weaknesses) || score.weaknesses.length === 0) {
    errors.push(`${file}: weaknesses must be a non-empty array`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Score format check passed');
process.exit(0);
