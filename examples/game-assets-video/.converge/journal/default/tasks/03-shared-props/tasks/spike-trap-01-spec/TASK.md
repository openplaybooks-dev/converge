---
id: spike-trap-01-spec
title: Validate Floor Spikes prop specification
description: Iron spikes embedded in stone block; extends and retracts. Deadly to step on while extended.
tags:
  - prop
  - spec
  - hazard
outputs:
  - assets/objects/spike-trap/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/spike-trap/SPEC.md
vars:
  obj_id: spike-trap
  obj_name: Floor Spikes
  obj_description: Iron spikes embedded in stone block; extends and retracts. Deadly to step on while extended.
  obj_category: hazard
  states: "[\"idle\",\"trigger\"]"
---

# Validate Floor Spikes Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: spike-trap
- **Name**: Floor Spikes
- **Category**: hazard
- **Description**: Iron spikes embedded in stone block; extends and retracts. Deadly to step on while extended.
- **States**: ["idle","trigger"]

## Task

Write `assets/objects/spike-trap/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/spike-trap/SPEC.md` exists and is non-empty.
