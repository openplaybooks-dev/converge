#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_ROOT="$(cd ../.. && pwd)"
CONVERGE_BIN="${CONVERGE_BIN:-$REPO_ROOT/packages/cli/dist/index.js}"

if [ ! -f "$CONVERGE_BIN" ]; then
  echo "Error: converge CLI not found at $CONVERGE_BIN" >&2
  echo "Build with: cd $REPO_ROOT && pnpm build" >&2
  exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: Set ANTHROPIC_API_KEY (used by SkillOpt's Claude backend)" >&2
  exit 1
fi

echo "-- skillopt --"
bash scripts/clean.sh "${1:-}"
node "$CONVERGE_BIN" run

echo
echo "artifacts:"
for f in output/best_skill.md output/history.json output/final_eval.json output/report.md; do
  [ -f "$f" ] && echo "  ok  $f" || echo "  missing  $f"
done
