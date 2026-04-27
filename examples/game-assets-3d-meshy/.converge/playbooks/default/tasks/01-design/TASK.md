---
title: Design Doc
description: Parse idea.md → pitch.md + characters.json (the source of truth for the rest of the pipeline).
wbs:
  type: shell
  path: scripts/build_design.js
outputs:
  - assets/characters.json
  - assets/pitch.md
checks:
  - id: characters-shape
    cmd: |
      node -e "const c=require('./assets/characters.json');if(!Array.isArray(c)||c.length<1)process.exit(1);for(const x of c)for(const k of ['id','class','humanoid','description','animations'])if(!(k in x))process.exit(1)"
    description: characters.json is a non-empty array with required fields
tags: [design, deterministic]
---

# Design Doc

Walks `idea.md` H3 sections under `## Required characters`. Each H3 (`### Warrior`, `### Mage`, `### Ranger`) is a class; each `- **id**: description` bullet under it is a character. The class determines the default animation list.

`characters.json` shape per entry:

```json
{ "id": "...", "class": "warrior|mage|ranger", "humanoid": true,
  "description": "...", "palette_hint": "...",
  "animations": ["Idle", "Walk", "Attack"] }
```

Re-edit `idea.md` and re-run to refresh.
