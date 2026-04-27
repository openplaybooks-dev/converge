---
title: Asset Registry
description: Auto-derive assets/REGISTRY.json from on-disk shared assets. Scenes reference the registry to reuse rather than regenerate.
dependencies:
  - "03-characters"
  - "03-shared-props"
outputs:
  - "assets/REGISTRY.json"
checks:
  - id: registry-exists
    cmd: test -s assets/REGISTRY.json
    description: REGISTRY.json was written
  - id: registry-has-shape
    cmd: |
      python -c "import json; r=json.load(open('assets/REGISTRY.json')); assert 'characters' in r and 'shared_props' in r, 'registry missing required top-level keys'"
    description: REGISTRY.json has characters[] and shared_props[]
tags:
  - registry
  - planning
---

# 04-registry-build — Asset Registry

The registry is the **smart inventory** scenes consult to decide whether to reuse a shared asset or generate a new one. It's auto-built from disk so there's no manual upkeep — re-running the script is always safe.

## Run

```bash
python3 scripts/build_registry.py
```

## What it produces

`assets/REGISTRY.json`:

```json
{
  "characters": [
    {
      "id": "hero-knight",
      "type": "character",
      "ref_canonical": "assets/characters/hero-knight/ref/canonical/canonical.png",
      "states": ["idle", "walk"],
      "atlas_paths": [...],
      "scenes_using": ["forest-tutorial", "dungeon-1"]
    }
  ],
  "shared_props": [
    {
      "id": "health-potion",
      "type": "shared_prop",
      "ref_image": "assets/objects-shared/health-potion/spritesheets/idle/idle.png",
      "states": ["idle", "collect"],
      "atlas_paths": [...],
      "scenes_using": ["forest-tutorial"]
    }
  ]
}
```

## scenes_using[]

This list is populated later by `build_scene_manifest.py` (Phase 5 per scene). Every time a scene's manifest is built and references a registry asset, the script appends the scene id to that asset's `scenes_using[]`. This script preserves any existing markings when re-run.

## Cost

Free — pure file-system walk + JSON write.
