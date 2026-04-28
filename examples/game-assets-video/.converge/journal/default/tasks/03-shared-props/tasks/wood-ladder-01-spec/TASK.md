---
id: wood-ladder-01-spec
title: Validate Wooden Ladder prop specification
description: "Vertical wooden ladder with iron rivets, two rails and evenly spaced rungs. Static interactive prop."
tags:
  - prop
  - spec
  - interactive
outputs:
  - assets/objects/wood-ladder/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/wood-ladder/SPEC.md
vars:
  obj_id: wood-ladder
  obj_name: Wooden Ladder
  obj_description: "Vertical wooden ladder with iron rivets, two rails and evenly spaced rungs. Static interactive prop."
  obj_category: interactive
  states: "[\"idle\"]"
---

# Validate Wooden Ladder Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: wood-ladder
- **Name**: Wooden Ladder
- **Category**: interactive
- **Description**: Vertical wooden ladder with iron rivets, two rails and evenly spaced rungs. Static interactive prop.
- **States**: ["idle"]

## Task

Write `assets/objects/wood-ladder/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/wood-ladder/SPEC.md` exists and is non-empty.
