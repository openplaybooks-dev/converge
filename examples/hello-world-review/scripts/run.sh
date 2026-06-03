#!/usr/bin/env bash
# Run the hello-world-review playbook end-to-end.
#
# The runner pauses at the review gate. Open the Studio at
#   http://localhost:3002/playbooks/default
# to approve the greeting (or request changes to trigger another attempt).
#
# Usage:
#   scripts/run.sh             # standard run
#   scripts/run.sh --hard      # wipe output/ before running (full re-run)
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_ROOT="$(cd ../.. && pwd)"
CONVERGE_BIN="${CONVERGE_BIN:-$REPO_ROOT/packages/cli/dist/index.js}"
if [ ! -f "$CONVERGE_BIN" ]; then
  echo "✗ converge CLI not found at $CONVERGE_BIN — run 'pnpm -r build' from the repo root first" >&2
  exit 1
fi

echo "── hello-world-review ──"
echo

scripts/clean.sh "${1:-}"

node "$CONVERGE_BIN" run

echo
echo "✓ artifacts:"
for f in output/greeting.json output/greeting.preview.html; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f (missing)"
  fi
done
