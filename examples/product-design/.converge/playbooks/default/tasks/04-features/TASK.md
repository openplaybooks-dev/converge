---
id: 04-features
title: Feature Analysis
description: For each epic, identify features, write META.md with design reasoning, and determine views
blocking: true
depends_on:
  - 03-epics
mode: spawner
inputs:
  - docs/product/epics.json
  - docs/product/research/user-personas.md
outputs:
  - docs/product/features/<epic-id>/catalog.json
  - docs/product/features/<epic-id>/<feature-id>/FEATURE.md
  - docs/product/features/<epic-id>/<feature-id>/META.md
  - docs/product/features/<epic-id>/<feature-id>/views.json
checks:
  - id: epic-catalogs-exist
    cmd: python3 -c "
import json, glob, os
with open('docs/product/epics.json') as f:
    epics = json.load(f)
missing = []
for epic in epics['epics']:
    path = f'docs/product/features/{epic[\"id\"]}/catalog.json'
    if not os.path.exists(path):
        missing.append(epic['id'])
if missing:
    print(f'Missing epic catalogs: {missing}')
    exit(1)
print(f'All {len(epics[\"epics\"])} epic catalogs exist')
"
    description: Every epic has a per-epic catalog.json
  - id: all-epics-have-features
    cmd: bash .converge/playbooks/default/scripts/validate-epic-coverage.sh
    description: Every epic has ≥1 feature
  - id: all-features-have-views
    cmd: bash .converge/playbooks/default/scripts/validate-feature-coverage.sh
    description: Every feature has ≥1 view
  - id: all-features-have-meta
    cmd: bash -c 'for f in docs/product/features/*/*/META.md; do test -f "$f" || exit 1; done'
    description: Every feature has META.md with design reasoning
  - id: no-spawn-failures
    cmd: 'test -f "$CONVERGE_SPAWN_DIR/STATUS.md" && ! grep -q "^\- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
    description: All feature-analysis spawns completed
spawn:
  template: feature-analysis
skills:
  - feature-prioritization
  - view-identification
---

# Feature Analysis

For each epic in epics.json, spawn a feature-analysis task that identifies features, writes META.md with design reasoning, prioritizes them for MVP, and determines views.

## Body

Read `docs/product/epics.json` and spawn one `feature-analysis` template instance per epic.

```bash
#!/bin/bash
# 04-features body — spawn one feature-analysis per epic

mkdir -p "$CONVERGE_SPAWN_DIR"

python3 -c "
import json, os

with open('docs/product/epics.json') as f:
    epics = json.load(f)

spawn_dir = os.environ.get('CONVERGE_SPAWN_DIR', '.converge/spawn')
os.makedirs(spawn_dir, exist_ok=True)

for epic in epics['epics']:
    epic_id = epic['id']
    spawn_file = os.path.join(spawn_dir, epic_id, 'spawn.yml')
    os.makedirs(os.path.dirname(spawn_file), exist_ok=True)

    # Write YAML manually to avoid pyyaml dependency
    target_personas = epic.get('target_personas', [])
    personas_yaml = ''
    if target_personas:
        personas_yaml = '\n'.join(f'    - {p}' for p in target_personas)
    else:
        personas_yaml = '    []'

    content = f'''template: feature-analysis
params:
  epicId: {epic['id']}
  epicTitle: {epic['title']}
  epicDescription: {epic.get('description', '')}
  priority: {epic.get('priority', 'should')}
  targetPersonas:
{personas_yaml}
'''
    with open(spawn_file, 'w') as f:
        f.write(content)

    print(f'  spawn.yml for {epic_id}')
"

echo "Feature analysis spawned for all epics"
```

## Spawning

One `feature-analysis` template instance per epic:
- Template: `templates/feature-analysis/`
- Params: epicId, epicTitle, epicDescription, priority, targetPersonas
- Each instance writes `docs/product/features/<epic-id>/catalog.json`, per-feature FEATURE.md + META.md + views.json

## MVP Focus

Every feature must explicitly scope what's in MVP vs deferred to v2+. The META.md file captures design rationale and trade-off decisions.
