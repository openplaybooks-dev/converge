#!/usr/bin/env bash
# Clean up all runtime artifacts from the catalog-batch test fixture.
# Safe to run at any time — only removes generated state, never source.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

echo "Cleaning test-catalog-batch runtime state..."

# Per-playbook generated files
for pb in inline-catalog external-catalog; do
  rm -rf ".converge/playbooks/$pb/catalog.json"
  rm -rf ".converge/playbooks/$pb/catalog.jsonl"
  rm -rf ".converge/playbooks/$pb/output"
done

# Framework runtime dirs (journal, inventory, artifacts)
rm -rf .converge/journal
rm -rf .converge/inventory
rm -rf .converge/artifacts

# Test-level output and temp files
rm -rf output
rm -rf catalog.jsonl

echo "  removed: catalog.json, catalog.jsonl, .converge/{journal,inventory,artifacts}, output/"
echo "Done."
