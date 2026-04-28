---
id: health-potion-01-spec
title: Validate Health Potion prop specification
description: "Red flask with sparkle particles, restores health when collected."
tags:
  - prop
  - spec
  - item
outputs:
  - assets/objects/health-potion/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/health-potion/SPEC.md
vars:
  obj_id: health-potion
  obj_name: Health Potion
  obj_description: "Red flask with sparkle particles, restores health when collected."
  obj_category: item
  states: "[\"idle\",\"collect\"]"
---

# Validate Health Potion Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: health-potion
- **Name**: Health Potion
- **Category**: item
- **Description**: Red flask with sparkle particles, restores health when collected.
- **States**: ["idle","collect"]

## Task

Write `assets/objects/health-potion/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/health-potion/SPEC.md` exists and is non-empty.
