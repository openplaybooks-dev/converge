#!/usr/bin/env node
/**
 * Check if dead code percentage exceeds threshold.
 * Used in CI to fail builds if dead code increases.
 *
 * Reads Knip JSON from stdin.
 * Exits with code 1 if dead code > threshold.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Ratcheted down from 10% after Phase 1-2 cleanup (2026-05-26)
const THRESHOLD_PERCENT = 7;

async function main() {
  // Read Knip JSON from stdin
  let knipData = '';
  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    knipData += chunk;
  }

  if (!knipData.trim()) {
    console.error('❌ No Knip data received on stdin');
    process.exit(1);
  }

  const data = JSON.parse(knipData);

  // Count dead code
  let deadFiles = 0;
  let unusedExports = 0;

  for (const issue of data.issues) {
    if (issue.files && issue.files.length > 0) {
      deadFiles += issue.files.length;
    }
    if (issue.exports && issue.exports.length > 0) {
      unusedExports += issue.exports.length;
    }
  }

  // Load complexity report to get total files
  let totalFiles = 0;
  try {
    const complexityJson = readFileSync(join(ROOT, 'complexity-report.json'), 'utf-8');
    const complexity = JSON.parse(complexityJson);
    totalFiles = complexity.summary.totalFiles;
  } catch (err) {
    console.warn('⚠️  Could not load complexity report, using issue count as baseline');
    totalFiles = data.issues.length;
  }

  const deadCodePercent = totalFiles > 0 ? (deadFiles / totalFiles) * 100 : 0;

  console.log(`📊 Dead Code Analysis:`);
  console.log(`   Dead files: ${deadFiles}`);
  console.log(`   Unused exports: ${unusedExports}`);
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Dead code: ${deadCodePercent.toFixed(1)}%`);
  console.log(`   Threshold: ${THRESHOLD_PERCENT}%`);

  if (deadCodePercent > THRESHOLD_PERCENT) {
    console.error(`\n❌ Dead code exceeds threshold (${deadCodePercent.toFixed(1)}% > ${THRESHOLD_PERCENT}%)`);
    console.error(`   Run 'pnpm dead-code:analyze' to see visualization`);
    process.exit(1);
  }

  console.log(`\n✅ Dead code within acceptable threshold`);
  process.exit(0);
}

main();
