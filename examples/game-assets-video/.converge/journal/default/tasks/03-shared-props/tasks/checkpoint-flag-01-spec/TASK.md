---
id: checkpoint-flag-01-spec
title: Validate Checkpoint Flag prop specification
description: Stone pedestal with a fabric flag on a pole; flag waves when the checkpoint activates.
tags:
  - prop
  - spec
  - interactive
outputs:
  - assets/objects/checkpoint-flag/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/checkpoint-flag/SPEC.md
vars:
  obj_id: checkpoint-flag
  obj_name: Checkpoint Flag
  obj_description: Stone pedestal with a fabric flag on a pole; flag waves when the checkpoint activates.
  obj_category: interactive
  states: "[\"idle\",\"activate\"]"
---

# Validate Checkpoint Flag Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: checkpoint-flag
- **Name**: Checkpoint Flag
- **Category**: interactive
- **Description**: Stone pedestal with a fabric flag on a pole; flag waves when the checkpoint activates.
- **States**: ["idle","activate"]

## Task

Write `assets/objects/checkpoint-flag/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/checkpoint-flag/SPEC.md` exists and is non-empty.
