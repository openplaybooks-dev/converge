---
id: 06-views
title: View Design
description: For each view across all features, spawn 4-step design pipeline (spec → meta → mockup → html-spec)
blocking: true
depends_on:
  - 04-features
  - 05-design-system
mode: spawner
inputs:
  - docs/product/features/*/catalog.json
  - docs/product/features/*/*/views.json
  - .design/system/DESIGN.md
  - .design/system/tokens.json
  - .design/system/component-archetypes.html
outputs:
  - .design/screens/<epic-id>/<feature-id>/<view-id>/SPEC.md
  - .design/screens/<epic-id>/<feature-id>/<view-id>/META.md
  - .design/screens/<epic-id>/<feature-id>/<view-id>/mockup.html
  - .design/screens/<epic-id>/<feature-id>/<view-id>/design.html
  - .design/screens/<epic-id>/<feature-id>/<view-id>/design.css
checks:
  - id: all-views-have-designs
    cmd: bash .converge/playbooks/default/scripts/check-design-completeness.sh
    description: Every view has complete design artifacts
  - id: designs-reference-tokens
    cmd: python3 -c "
import glob, re
html_files = glob.glob('.design/screens/**/design.html', recursive=True)
if not html_files:
    print('No design.html files found'); exit(1)
for f in html_files:
    content = open(f).read()
    assert re.search(r'var\(--\w', content), f'{f} does not reference design tokens'
print(f'All {len(html_files)} design files reference tokens')
"
    description: ALL design.html files use design system tokens
  - id: all-views-have-meta
    cmd: python3 -c "
import glob
meta_files = glob.glob('.design/screens/**/META.md', recursive=True)
assert len(meta_files) >= 1, f'Expected ≥1 META.md, found {len(meta_files)}'
print(f'Found {len(meta_files)} view META.md files')
"
    description: View META.md files exist with design rationale
  - id: no-spawn-failures
    cmd: 'test -f "$CONVERGE_SPAWN_DIR/STATUS.md" && ! grep -q "^\- \[ \]" "$CONVERGE_SPAWN_DIR/STATUS.md"'
    description: All view-design spawns completed
spawn:
  template: view-design
skills:
  - view-spec-writer
  - view-meta-writer
  - html-mockup
---

# View Design

For each view identified in all features, spawn the 4-step design pipeline (spec → meta → mockup → html-spec).

## Body

Walk `docs/product/features/*/catalog.json` to discover all epics and their features, then spawn one `view-design` template instance per view. Sections, tabs, and modals are read from each feature's `views.json` and passed as spawn params.

```bash
#!/bin/bash
# 06-views body — walk per-epic catalog tree, spawn one view-design per view

mkdir -p "$CONVERGE_SPAWN_DIR"

python3 -c "
import json, glob, os

spawn_dir = os.environ.get('CONVERGE_SPAWN_DIR', '.converge/spawn')
os.makedirs(spawn_dir, exist_ok=True)

view_count = 0
# Walk per-epic catalogs (no master catalog)
for epic_catalog_path in sorted(glob.glob('docs/product/features/*/catalog.json')):
    with open(epic_catalog_path) as f:
        epic_data = json.load(f)

    epic_id = epic_data.get('epic_id', os.path.basename(os.path.dirname(epic_catalog_path)))

    for feature in epic_data.get('features', []):
        feature_id = feature['id']
        views_file = f'docs/product/features/{epic_id}/{feature_id}/views.json'

        if not os.path.exists(views_file):
            continue

        with open(views_file) as vf:
            views_data = json.load(vf)

        for view in views_data.get('views', []):
            view_id = view['id']
            spawn_id = f'{epic_id}-{feature_id}-{view_id}'

            spawn_file = os.path.join(spawn_dir, spawn_id, 'spawn.yml')
            os.makedirs(os.path.dirname(spawn_file), exist_ok=True)

            # Build interactions list for YAML
            interactions = view.get('interactions', [])
            interactions_yaml = ''
            if interactions:
                for ix in interactions:
                    if isinstance(ix, dict):
                        action = ix.get('action', '')
                        interactions_yaml += f'    - action: {action}\n'
                        if 'response' in ix:
                            interactions_yaml += f'      response: {ix[\"response\"]}\n'
                    else:
                        interactions_yaml += f'    - {ix}\n'
            else:
                interactions_yaml = '    []'

            # Build sections list for YAML
            sections = view.get('sections', [])
            sections_yaml = ''
            if sections:
                for sec in sections:
                    sec_id = sec.get('id', '')
                    sec_title = sec.get('title', '')
                    sec_layout = sec.get('layout', '')
                    components = sec.get('components', [])
                    data_fields = sec.get('data_fields', [])
                    states = sec.get('states', [])
                    sections_yaml += f'    - id: {sec_id}\n'
                    sections_yaml += f'      title: {sec_title}\n'
                    sections_yaml += f'      layout: {sec_layout}\n'
                    sections_yaml += f'      components: [{\", \".join(components)}]\n'
                    sections_yaml += f'      data_fields: [{\", \".join(data_fields)}]\n'
                    sections_yaml += f'      states: [{\", \".join(states)}]\n'
            else:
                sections_yaml = '    []'

            # Build tabs list for YAML
            tabs = view.get('tabs', [])
            tabs_yaml = ''
            if tabs:
                for tab in tabs:
                    tab_id = tab.get('id', '')
                    tab_label = tab.get('label', '')
                    tab_type = tab.get('content_type', '')
                    tabs_yaml += f'    - id: {tab_id}\n'
                    tabs_yaml += f'      label: {tab_label}\n'
                    tabs_yaml += f'      content_type: {tab_type}\n'
            else:
                tabs_yaml = '    []'

            # Build modals list for YAML
            modals = view.get('modals', [])
            modals_yaml = ''
            if modals:
                for modal in modals:
                    modal_id = modal.get('id', '')
                    modal_trigger = modal.get('trigger', '')
                    modal_type = modal.get('type', '')
                    modals_yaml += f'    - id: {modal_id}\n'
                    modals_yaml += f'      trigger: {modal_trigger}\n'
                    modals_yaml += f'      type: {modal_type}\n'
            else:
                modals_yaml = '    []'

            content = f'''template: view-design
params:
  epicId: {epic_id}
  featureId: {feature_id}
  viewId: {view_id}
  viewTitle: {view.get('title', view_id)}
  persona: {view.get('target_persona', 'general')}
  priority: {view.get('priority', 'medium')}
  interactions:
{interactions_yaml}
  sections:
{sections_yaml}
  tabs:
{tabs_yaml}
  modals:
{modals_yaml}
'''
            with open(spawn_file, 'w') as f:
                f.write(content)

            view_count += 1
            print(f'  spawn.yml for {spawn_id}')

print(f'Total views spawned: {view_count}')
"

echo "View design pipeline spawned for all views"
```

## Spawning

One `view-design` template instance per view:
- Template: `templates/view-design/`
- Params: epicId, featureId, viewId, viewTitle, persona, priority, interactions
- Each instance runs 4 static children: spec → meta → mockup → html-spec

## Pipeline

Each view goes through the template's static children:
1. **01-spec**: Writes SPEC.md with industry-standard format
2. **02-meta**: Writes META.md with design rationale and MVP scope
3. **03-mockup**: Creates state-stacked HTML mockup (all variants in one file)
4. **04-wire**: Produces production-ready design.html + design.css

## After Spawn

The framework will:
1. Discover each view's `spawn.yml`
2. Resolve `templates/view-design/TASK.md`
3. Apply params and execute 4-step pipeline
4. Write results to `.design/screens/<epic-id>/<feature-id>/<view-id>/`
