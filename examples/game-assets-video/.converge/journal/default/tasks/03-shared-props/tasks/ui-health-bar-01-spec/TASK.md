---
id: ui-health-bar-01-spec
title: Validate Horizontal Green Health Bar prop specification
description: Horizontal green health bar
tags:
  - prop
  - spec
  - item
outputs:
  - assets/objects/ui-health-bar/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/ui-health-bar/SPEC.md
vars:
  obj_id: ui-health-bar
  obj_name: Horizontal Green Health Bar
  obj_description: Horizontal green health bar
  obj_category: item
  states: "[\"idle\"]"
---

# Validate Horizontal Green Health Bar Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: ui-health-bar
- **Name**: Horizontal Green Health Bar
- **Category**: item
- **Description**: Horizontal green health bar
- **States**: ["idle"]

## Task

Write `assets/objects/ui-health-bar/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/ui-health-bar/SPEC.md` exists and is non-empty.
