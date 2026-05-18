#!/usr/bin/env bash
# Wipe transient state before a fresh run.
# Keeps: .converge/playbooks/, .converge/project.yaml, README, scripts/, output/
# Removes: .converge/journal/, .converge/artifacts/, .converge/inventory/
# With --hard, also removes output/ (the deliverables).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ removing .converge/journal"
rm -rf .converge/journal
echo "→ removing .converge/artifacts"
rm -rf .converge/artifacts
echo "→ removing .converge/inventory"
rm -rf .converge/inventory

if [ "${1:-}" = "--hard" ]; then
  echo "→ removing output/ (--hard)"
  rm -rf output
fi

echo "✓ clean (output/ preserved unless --hard)"
