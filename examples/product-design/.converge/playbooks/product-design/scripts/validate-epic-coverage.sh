#!/bin/bash
# validate-epic-coverage.sh
# Check that every epic in epics.json has ≥1 feature defined
# Walks per-epic catalog.json files (no master catalog)

set -euo pipefail

EPICS_FILE="docs/product/epics.json"
CATALOG_DIR="docs/product/features"

if [ ! -f "$EPICS_FILE" ]; then
  echo "❌ epics.json not found"
  exit 1
fi

python3 -c "
import json, os

with open('$EPICS_FILE') as f:
    epics = json.load(f)

failed = 0
for epic in epics['epics']:
    epic_id = epic['id']
    epic_catalog = f'$CATALOG_DIR/{epic_id}/catalog.json'

    if not os.path.exists(epic_catalog):
        print(f'❌ Epic {epic_id}: catalog.json not found')
        failed += 1
        continue

    with open(epic_catalog) as f:
        catalog = json.load(f)

    feature_count = len(catalog.get('features', []))
    if feature_count == 0:
        print(f'❌ Epic {epic_id}: No features defined')
        failed += 1
    else:
        print(f'✅ Epic {epic_id}: {feature_count} features defined')

if failed > 0:
    exit(1)
else:
    print('✅ All epics have features')
    exit(0)
"
