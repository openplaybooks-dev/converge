#!/usr/bin/env bash
# Run the social-sim playbook end-to-end.
#
# Usage:
#   scripts/run.sh                                                  # defaults: misinfo, 10 personas, 3 ticks
#   scripts/run.sh --scenario polarization
#   scripts/run.sh --scenario misinfo --population 3 --steps 2      # tiny smoke run
#   scripts/run.sh --run-id run-2026-05-18T12-00                    # resume / re-run an existing id
set -euo pipefail
cd "$(dirname "$0")/.."

# Playbook input overrides (passed as --<key> <value> to `converge run`).
RUN_FLAGS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --scenario)     RUN_FLAGS+=(--scenario       "$2"); shift 2 ;;
    --population)   RUN_FLAGS+=(--populationSize "$2"); shift 2 ;;
    --steps)        RUN_FLAGS+=(--steps          "$2"); shift 2 ;;
    --run-id)       RUN_FLAGS+=(--runId          "$2"); shift 2 ;;
    --recommender)  RUN_FLAGS+=(--recommender    "$2"); shift 2 ;;
    --seed-posts)   RUN_FLAGS+=(--seedPosts      "$2"); shift 2 ;;
    --rng-seed)     RUN_FLAGS+=(--rngSeed        "$2"); shift 2 ;;
    -h|--help)      grep '^# ' "$0" | sed 's/^# //'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

REPO_ROOT="$(cd ../.. && pwd)"
CONVERGE_BIN="${CONVERGE_BIN:-$REPO_ROOT/packages/cli/dist/index.js}"
if [ ! -f "$CONVERGE_BIN" ]; then
  echo "✗ converge CLI not found at $CONVERGE_BIN — run 'pnpm -r build' from the repo root first" >&2
  exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}${ANTHROPIC_AUTH_TOKEN:-}${MINIMAX_API_KEY:-}" ]; then
  echo "✗ Set ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / MINIMAX_API_KEY) — persona decisions need an LLM" >&2
  exit 1
fi

scripts/clean.sh

echo "── social-sim ${RUN_FLAGS[*]} ──"
echo

node "$CONVERGE_BIN" run social-sim "${RUN_FLAGS[@]}"

echo
RUNID="$(cat .converge/.run-id 2>/dev/null || true)"
if [ -n "$RUNID" ]; then
  echo "✓ run id: $RUNID"
  for f in "runs/$RUNID/personas.json" "runs/$RUNID/graph.json" "runs/$RUNID/timeline.jsonl" "vault/runs/$RUNID/overview.md"; do
    [ -f "$f" ] && echo "  ✓ $f" || echo "  ✗ $f (missing)"
  done
  echo "  posts:   $(ls "vault/runs/$RUNID/posts" 2>/dev/null | wc -l | tr -d ' ')"
  echo "  feeds:   $(find "vault/runs/$RUNID/feeds" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')"
  echo "  actions: $(ls "vault/runs/$RUNID/actions" 2>/dev/null | wc -l | tr -d ' ')"
fi
