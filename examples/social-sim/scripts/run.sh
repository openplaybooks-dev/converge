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

SCENARIO=""
POPULATION=""
STEPS=""
RUN_ID=""
RECOMMENDER=""
SEED_POSTS=""
RNG_SEED=""

while [ $# -gt 0 ]; do
  case "$1" in
    --scenario)     SCENARIO="$2";     shift 2 ;;
    --population)   POPULATION="$2";   shift 2 ;;
    --steps)        STEPS="$2";        shift 2 ;;
    --run-id)       RUN_ID="$2";       shift 2 ;;
    --recommender)  RECOMMENDER="$2";  shift 2 ;;
    --seed-posts)   SEED_POSTS="$2";   shift 2 ;;
    --seed)         RNG_SEED="$2";     shift 2 ;;
    -h|--help)      grep '^# ' "$0" | sed 's/^# //'; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

[ -n "$SCENARIO" ]    && export CONVERGE_VAR_SCENARIO="$SCENARIO"
[ -n "$POPULATION" ]  && export CONVERGE_VAR_POPULATIONSIZE="$POPULATION"
[ -n "$STEPS" ]       && export CONVERGE_VAR_STEPS="$STEPS"
[ -n "$RECOMMENDER" ] && export CONVERGE_VAR_RECOMMENDER="$RECOMMENDER"
[ -n "$SEED_POSTS" ]  && export CONVERGE_VAR_SEEDPOSTS="$SEED_POSTS"
[ -n "$RNG_SEED" ]    && export CONVERGE_VAR_SEED="$RNG_SEED"
[ -n "$RUN_ID" ]      && export CONVERGE_VAR_RUNID="$RUN_ID"

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

echo "── social-sim: scenario=${CONVERGE_VAR_SCENARIO:-misinfo} pop=${CONVERGE_VAR_POPULATIONSIZE:-10} steps=${CONVERGE_VAR_STEPS:-3} ──"
echo

node "$CONVERGE_BIN" run social-sim

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
