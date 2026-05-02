#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
FAILED=0

echo "=== Contract Probe Report ==="
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Playbook: declarative-discovery"
echo "Predecessors: cli-redesign, remove-goals, dbt-paradigm"
echo ""

for probe in "$DIR"/check-*.sh; do
  name=$(basename "$probe" .sh)
  if bash "$probe" 2>/dev/null; then
    echo "PASS: $name"
  else
    echo "FAIL: $name"
    FAILED=1
  fi
done

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "RESULT: All probes pass."
  exit 0
else
  echo "RESULT: Some probes FAILED."
  exit 1
fi
