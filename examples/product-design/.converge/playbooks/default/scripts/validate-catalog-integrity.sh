#!/bin/bash
# validate-catalog-integrity.sh
# Walks the per-level catalog tree and verifies completeness:
# every epic has features, every feature has views, every view has design artifacts.

set -euo pipefail

EPICS_FILE="docs/product/epics.json"
FEATURES_DIR="docs/product/features"
DESIGN_DIR=".design/screens"

if [ ! -f "$EPICS_FILE" ]; then
  echo "❌ epics.json not found at $EPICS_FILE"
  exit 1
fi

python3 -c "
import json, glob, os

with open('$EPICS_FILE') as f:
    epics = json.load(f)

errors = []
total_features = 0
total_views = 0
total_sections = 0

for epic in epics['epics']:
    epic_id = epic['id']
    epic_catalog = os.path.join('$FEATURES_DIR', epic_id, 'catalog.json')

    if not os.path.exists(epic_catalog):
        errors.append(f'Epic {epic_id}: catalog.json not found at {epic_catalog}')
        continue

    with open(epic_catalog) as f:
        epic_data = json.load(f)

    features = epic_data.get('features', [])
    total_features += len(features)

    if not features:
        errors.append(f'Epic {epic_id}: no features defined')
        continue

    for feature in features:
        feature_id = feature['id']
        views_file = os.path.join('$FEATURES_DIR', epic_id, feature_id, 'views.json')

        if not os.path.exists(views_file):
            errors.append(f'{epic_id}/{feature_id}: views.json not found')
            continue

        with open(views_file) as f:
            views_data = json.load(f)

        views = views_data.get('views', [])
        total_views += len(views)

        if not views:
            errors.append(f'{epic_id}/{feature_id}: no views defined')
            continue

        for view in views:
            view_id = view['id']
            design_dir = os.path.join('$DESIGN_DIR', epic_id, feature_id, view_id)

            # Check required artifacts
            required = ['SPEC.md', 'META.md', 'mockup.html', 'design.html', 'design.css']
            for artifact in required:
                path = os.path.join(design_dir, artifact)
                if not os.path.exists(path):
                    errors.append(f'{epic_id}/{feature_id}/{view_id}: missing {artifact}')

            # Check sections from views.json
            sections = view.get('sections', [])
            total_sections += len(sections)
            if not sections:
                errors.append(f'{epic_id}/{feature_id}/{view_id}: no sections defined in views.json')

print(f'Catalog: {len(epics[\"epics\"])} epics, {total_features} features, {total_views} views, {total_sections} sections')

if errors:
    for e in errors:
        print(f'❌ {e}')
    exit(1)

print('✅ Catalog integrity: full chain verified')
exit(0)
"
