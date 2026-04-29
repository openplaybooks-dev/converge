---
id: ui-key-slot-01-spec
title: Validate User Interface Slot For The Gold Key prop specification
description: User interface slot for the gold key
tags:
  - prop
  - spec
  - item
outputs:
  - assets/objects/ui-key-slot/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/ui-key-slot/SPEC.md
vars:
  obj_id: ui-key-slot
  obj_name: User Interface Slot For The Gold Key
  obj_description: User interface slot for the gold key
  obj_category: item
  states: "[\"idle\"]"
---

# Validate User Interface Slot For The Gold Key Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: ui-key-slot
- **Name**: User Interface Slot For The Gold Key
- **Category**: item
- **Description**: User interface slot for the gold key
- **States**: ["idle"]

## Task

Write `assets/objects/ui-key-slot/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/ui-key-slot/SPEC.md` exists and is non-empty.
