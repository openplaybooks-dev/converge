#!/usr/bin/env bash
# Run the data-pipeline playbook end-to-end.
#
# Usage:
#   scripts/run.sh             # use the committed RSS snapshot (reproducible)
#   scripts/run.sh --live      # re-fetch RSS feeds via WebFetch, overwrite snapshot
#
# Writes artifacts to data/source/ and episodes/<YYYY-MM-DD>/.
# Provider credentials come from ANTHROPIC_API_KEY
# (or ANTHROPIC_AUTH_TOKEN / MINIMAX_API_KEY).
set -euo pipefail
cd "$(dirname "$0")/.."

INGEST_MODE="snapshot"
if [ "${1:-}" = "--live" ]; then
  INGEST_MODE="live"
fi
export CONVERGE_VAR_INGESTMODE="$INGEST_MODE"

REPO_ROOT="$(cd ../.. && pwd)"
CONVERGE_BIN="${CONVERGE_BIN:-$REPO_ROOT/packages/cli/dist/index.js}"
if [ ! -f "$CONVERGE_BIN" ]; then
  echo "✗ converge CLI not found at $CONVERGE_BIN — run 'pnpm -r build' from the repo root first" >&2
  exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}${ANTHROPIC_AUTH_TOKEN:-}${MINIMAX_API_KEY:-}" ]; then
  echo "✗ Set ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / MINIMAX_API_KEY)" >&2
  exit 1
fi

echo "── data-pipeline ($INGEST_MODE mode) ──"
if [ "$INGEST_MODE" = "snapshot" ] && [ ! -f data/source/feeds-snapshot.xml ]; then
  echo "  ! no committed snapshot found — seeding one via --live"
  export CONVERGE_VAR_INGESTMODE="live"
  INGEST_MODE="live"
fi
echo

scripts/clean.sh

node "$CONVERGE_BIN" run

echo
echo "✓ artifacts:"
for f in data/source/feeds-snapshot.xml data/source/articles.json data/clusters.json; do
  if [ -f "$f" ]; then
    echo "  ✓ $f"
  else
    echo "  ✗ $f (missing)"
  fi
done
LATEST_EP="$(ls -td episodes/*/ 2>/dev/null | head -1 || true)"
if [ -n "$LATEST_EP" ]; then
  for f in script.md episode.json validated.json; do
    if [ -f "$LATEST_EP$f" ]; then
      echo "  ✓ $LATEST_EP$f"
    else
      echo "  ✗ $LATEST_EP$f (missing)"
    fi
  done
fi
