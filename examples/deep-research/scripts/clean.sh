#!/usr/bin/env bash
# Wipe transient state before a fresh run.
# Keeps: .converge/playbooks/, .converge/project.yml, .converge/skills/,
#        .converge/inventory/, questions/<slug>/question.md, README, scripts/
# Removes: .converge/journal/, .converge/artifacts/
# With --hard, also removes questions/<slug>/output/ (the published deliverables).
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:-}"
if [ -z "$SLUG" ]; then
  echo "usage: scripts/clean.sh <question-slug> [--hard]" >&2
  exit 2
fi

echo "→ removing .converge/journal"
rm -rf .converge/journal
echo "→ removing .converge/artifacts"
rm -rf .converge/artifacts

if [ "${2:-}" = "--hard" ]; then
  echo "→ removing questions/$SLUG/output (--hard)"
  rm -rf "questions/$SLUG/output"
fi

echo "✓ clean (inventory + outputs preserved)"
