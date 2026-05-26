#!/usr/bin/env bash
# wave_check for the converger task.
# Exit 0 = halt (plateau detected, success)
# Exit 1 = continue (still improving or not enough data)
# Exit 2 = halt (degrading, failure)
set -euo pipefail
cd "$(dirname "$0")/.."

HISTORY="output/history.json"
[ -f "$HISTORY" ] || exit 1

node -e "
  const h = JSON.parse(require('fs').readFileSync('$HISTORY', 'utf-8'));
  const steps = h.steps || [];

  // Need at least 3 epochs to make a decision
  if (steps.length < 3) process.exit(1);

  const last3 = steps.slice(-3).map(s => s.score);
  const deltas = [];
  for (let i = 1; i < last3.length; i++) {
    deltas.push(Math.abs(last3[i] - last3[i - 1]));
  }
  const maxDelta = Math.max(...deltas);

  // Plateau: all recent deltas < 0.01
  if (maxDelta < 0.01) {
    console.log('Plateau detected (max delta=' + maxDelta.toFixed(4) + ')');
    process.exit(0);
  }

  // Degrading: last 3 all below baseline
  const baseline = h.baseline_score;
  if (typeof baseline === 'number' && last3.every(s => s < baseline)) {
    console.log('Degrading: last 3 scores below baseline (' + baseline.toFixed(4) + ')');
    process.exit(2);
  }

  // Otherwise continue
  console.log('Continuing (max delta=' + maxDelta.toFixed(4) + ')');
  process.exit(1);
"
