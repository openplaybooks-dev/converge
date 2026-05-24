---
id: 05-design
title: Design Mockups
description: Spawn one HTML mockup per feature from the catalog
mode: spawner
spawn:
  min_children: 1
blocking: true
depends_on:
  - 04-epics
inputs:
  - docs/product/features/*/catalog.json
outputs:
  - .design/screens/*/*/design.html
checks:
  - id: mockups-exist
    cmd: test $(find .design/screens -name 'design.html' 2>/dev/null | wc -l) -ge 1
---

# Design Mockups — Spawner

Read each feature catalog and spawn one `design-mockup` template task per feature.

```bash
#!/bin/bash
set -euo pipefail

TEMPLATE=".converge/playbooks/product-design/templates/design-mockup/TASK.md"

python3 -c "
import json, glob
for path in sorted(glob.glob('docs/product/features/*/catalog.json')):
    with open(path) as f:
        data = json.load(f)
    epic_id = data['epicId']
    for feat in data.get('features', []):
        print(f'{epic_id} {feat[\"id\"]}')
" | while read epicId featureId; do
  converge spawn task \
    --id "${epicId}-${featureId}" \
    --task-file "$TEMPLATE" \
    --var "epicId=$epicId" \
    --var "featureId=$featureId"
done
```
