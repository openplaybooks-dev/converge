#!/bin/bash
# validate-feature-coverage.sh
# Check that every feature has ≥1 view defined
# Walks per-epic catalog.json → per-feature views.json (no master catalog)

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
total_views = 0

for epic in epics['epics']:
    epic_id = epic['id']
    epic_catalog = f'$CATALOG_DIR/{epic_id}/catalog.json'

    if not os.path.exists(epic_catalog):
        print(f'❌ Epic {epic_id}: catalog.json not found')
        failed += 1
        continue

    with open(epic_catalog) as f:
        epic_data = json.load(f)

    for feature in epic_data.get('features', []):
        feature_id = feature['id']
        views_file = f'$CATALOG_DIR/{epic_id}/{feature_id}/views.json'

        if not os.path.exists(views_file):
            print(f'❌ {epic_id}/{feature_id}: views.json not found')
            failed += 1
            continue

        with open(views_file) as f:
            views_data = json.load(f)

        view_count = len(views_data.get('views', []))
        total_views += view_count

        if view_count == 0:
            print(f'❌ {epic_id}/{feature_id}: No views defined')
            failed += 1
        else:
            print(f'✅ {epic_id}/{feature_id}: {view_count} views defined')

print(f'')
print(f'Total views across all features: {total_views}')
print(f'Features missing views: {failed}')

if failed > 0:
    exit(1)
else:
    exit(0)
"
