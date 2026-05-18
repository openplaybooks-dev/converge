#!/usr/bin/env bash
# Run the hello-world playbook end-to-end.
#
# Usage:
#   scripts/run.sh             # standard run
#   scripts/run.sh --hard      # wipe output/ before running (full re-run)
#
# Writes artifacts to output/.
# Uses the Claude Code provider (default Anthropic endpoint). Sign in via
# `claude login` or set ANTHROPIC_API_KEY before running.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_ROOT="$(cd ../.. && pwd)"
CONVERGE_BIN="${CONVERGE_BIN:-$REPO_ROOT/packages/cli/dist/index.js}"
if [ ! -f "$CONVERGE_BIN" ]; then
  echo "✗ converge CLI not found at $CONVERGE_BIN — run 'pnpm -r build' from the repo root first" >&2
  exit 1
fi

echo "── hello-world ──"
echo

scripts/clean.sh "${1:-}"

node "$CONVERGE_BIN" run

echo
echo "✓ artifacts:"
for f in output/greeting.json output/hello.txt; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f (missing)"
  fi
done
