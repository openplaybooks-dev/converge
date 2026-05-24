---
id: 05-features
title: Feature Analysis
description: Spawn one feature-analysis task per epic from epics.json
mode: spawner
spawn:
  min_children: 1
blocking: true
depends_on:
  - 01-epic-catalog
inputs:
  - docs/product/epics.json
outputs:
  - docs/product/features/*/catalog.json
checks:
  - id: catalogs-exist
    cmd: test $(find docs/product/features -name 'catalog.json' 2>/dev/null | wc -l) -ge 1
---

# Feature Analysis — Spawner

```bash
#!/bin/bash
set -euo pipefail

TEMPLATE=".converge/playbooks/product-design/templates/feature-analysis/TASK.md"

for epicId in $(python3 -c "
import json
with open('docs/product/epics.json') as f:
    data = json.load(f)
for e in data.get('epics', []):
    print(e['id'])
"); do
  converge spawn task \
    --id "$epicId" \
    --task-file "$TEMPLATE" \
    --var "epicId=$epicId"
done
```
