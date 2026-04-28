---
id: gold-key-01-spec
title: Validate Gold Key prop specification
description: "Ornate golden key with gem inset, unlocks treasure chests."
tags:
  - prop
  - spec
  - item
outputs:
  - assets/objects/gold-key/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/gold-key/SPEC.md
vars:
  obj_id: gold-key
  obj_name: Gold Key
  obj_description: "Ornate golden key with gem inset, unlocks treasure chests."
  obj_category: item
  states: "[\"idle\",\"collect\"]"
---

# Validate Gold Key Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: gold-key
- **Name**: Gold Key
- **Category**: item
- **Description**: Ornate golden key with gem inset, unlocks treasure chests.
- **States**: ["idle","collect"]

## Task

Write `assets/objects/gold-key/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/gold-key/SPEC.md` exists and is non-empty.
