#!/bin/bash
# check-design-completeness.sh
# Verify every view has complete design artifacts
# Walks per-epic catalog tree (no master catalog)

set -euo pipefail

CATALOG_DIR="docs/product/features"
DESIGN_DIR=".design/screens"

python3 -c "
import json, glob, os

failed = 0
total = 0
complete = 0

# Walk per-epic catalogs
for epic_catalog_path in sorted(glob.glob('$CATALOG_DIR/*/catalog.json')):
    epic_id = os.path.basename(os.path.dirname(epic_catalog_path))

    with open(epic_catalog_path) as f:
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

        for view in views_data.get('views', []):
            view_id = view['id']
            total += 1

            spec_path = f'$DESIGN_DIR/{epic_id}/{feature_id}/{view_id}/SPEC.md'
            meta_path = f'$DESIGN_DIR/{epic_id}/{feature_id}/{view_id}/META.md'
            html_path = f'$DESIGN_DIR/{epic_id}/{feature_id}/{view_id}/design.html'
            css_path = f'$DESIGN_DIR/{epic_id}/{feature_id}/{view_id}/design.css'

            missing = []
            if not os.path.exists(spec_path):
                missing.append('SPEC.md')
            if not os.path.exists(meta_path):
                missing.append('META.md')
            if not os.path.exists(html_path):
                missing.append('design.html')
            if not os.path.exists(css_path):
                missing.append('design.css')

            if missing:
                print(f'❌ {epic_id}/{feature_id}/{view_id}: Missing {', '.join(missing)}')
                failed += 1
            else:
                print(f'✅ {epic_id}/{feature_id}/{view_id}: Complete')
                complete += 1

print(f'')
print(f'Complete views: {complete}/{total}')
print(f'Missing artifacts: {failed}')

if failed > 0:
    exit(1)
else:
    exit(0)
"
