#!/usr/bin/env bash
# Run the deep-research playbook against one question folder.
#
# Usage:
#   scripts/run.sh <question-slug>
#
# Reads the prompt from questions/<slug>/question.md. Writes artifacts to
# questions/<slug>/output/. Provider credentials come from ANTHROPIC_API_KEY
# (or ANTHROPIC_AUTH_TOKEN / MINIMAX_API_KEY / DEEPSEEK_API_KEY).
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  AVAIL="$(ls questions/ 2>/dev/null | grep -v '^_' | tr '\n' ' ')"
  echo "usage: scripts/run.sh <question-slug>" >&2
  echo "  available: ${AVAIL:-(none — add one under questions/)}" >&2
  exit 2
fi
QDIR="questions/$SLUG"
if [ ! -f "$QDIR/question.md" ]; then
  echo "✗ $QDIR/question.md not found" >&2
  exit 1
fi

REPO_ROOT="$(cd ../.. && pwd)"
CONVERGE_BIN="${CONVERGE_BIN:-$REPO_ROOT/packages/cli/dist/index.js}"
if [ ! -f "$CONVERGE_BIN" ]; then
  echo "✗ converge CLI not found at $CONVERGE_BIN — run 'pnpm -r build' from the repo root first" >&2
  exit 1
fi

if [ -z "${ANTHROPIC_API_KEY:-}${ANTHROPIC_AUTH_TOKEN:-}${MINIMAX_API_KEY:-}${DEEPSEEK_API_KEY:-}" ]; then
  echo "✗ Set ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN / MINIMAX_API_KEY / DEEPSEEK_API_KEY)" >&2
  exit 1
fi

echo "── deep-research: $SLUG ──"
echo "question: $(head -1 "$QDIR/question.md")"
echo

scripts/clean.sh "$SLUG"

# Hand the active question dir to the bootstrap seed via a small dotfile.
# The bootstrap's body tells the agent to read this file and inline its
# value into the spawn commands.
mkdir -p .converge
echo "$QDIR" > .converge/.question-dir

node "$CONVERGE_BIN" run deep-research

echo
echo "✓ artifacts: $QDIR/output/"
if [ -f "$QDIR/output/3-report/final-report.md" ]; then
  echo "✓ final report: $QDIR/output/3-report/final-report.md"
fi
