#!/usr/bin/env bash
# Wipe transient state before a fresh run.
# Keeps: .converge/playbooks/, .converge/project.yml, README, scripts/, runs/, vault/
# Removes: .converge/journal/, .converge/artifacts/, .converge/inventory/, .converge/.run-id
# With --hard: also removes runs/, vault/runs/, vault/reports/.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ removing .converge/journal"
rm -rf .converge/journal
echo "→ removing .converge/artifacts"
rm -rf .converge/artifacts
echo "→ removing .converge/inventory"
rm -rf .converge/inventory
rm -f .converge/.run-id

if [ "${1:-}" = "--hard" ]; then
  echo "→ removing runs/ (--hard)"
  rm -rf runs
  echo "→ removing vault/runs (--hard)"
  rm -rf vault/runs
  echo "→ removing vault/reports (--hard)"
  rm -rf vault/reports
fi

echo "✓ clean"
