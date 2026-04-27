---
id: "{{obj_id}}-01-spec"
title: "Validate {{obj_name}} prop specification"
description: "{{obj_description}}"
outputs:
  - "assets/objects/{{obj_id}}/SPEC.md"
checks:
  - id: spec-exists
    cmd: test -s assets/objects/{{obj_id}}/SPEC.md
    description: Prop SPEC.md exists
tags:
  - prop
  - spec
  - "{{obj_category}}"
---

# Validate {{obj_name}} Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: {{obj_id}}
- **Name**: {{obj_name}}
- **Category**: {{obj_category}}
- **Description**: {{obj_description}}
- **States**: {{states}}

## Task

Write `assets/objects/{{obj_id}}/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/{{obj_id}}/SPEC.md` exists and is non-empty.
