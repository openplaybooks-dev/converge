---
id: bounce-spring-01-spec
title: Validate Coil Spring prop specification
description: Metal coil spring mounted to floor plate; compresses on contact then launches upward.
tags:
  - prop
  - spec
  - interactive
outputs:
  - assets/objects/bounce-spring/SPEC.md
checks:
  - id: spec-exists
    description: Prop SPEC.md exists
    cmd: test -s assets/objects/bounce-spring/SPEC.md
vars:
  obj_id: bounce-spring
  obj_name: Coil Spring
  obj_description: Metal coil spring mounted to floor plate; compresses on contact then launches upward.
  obj_category: interactive
  states: "[\"idle\",\"bounce\"]"
---

# Validate Coil Spring Specification

Ensure the prop / hazard / interactive specification is complete and ready for generation.

## Prop Details

- **ID**: bounce-spring
- **Name**: Coil Spring
- **Category**: interactive
- **Description**: Metal coil spring mounted to floor plate; compresses on contact then launches upward.
- **States**: ["idle","bounce"]

## Task

Write `assets/objects/bounce-spring/SPEC.md` summarizing the prop:

- One short paragraph on visual identity (silhouette, colors, palette discipline).
- Per-state animation intent (one sentence each), drawn from the keyframes table.
- Notes on category-specific behavior:
  - **item** — collected by player, despawns on collect.
  - **hazard** — damages player while in active state.
  - **interactive** — triggered by player action; persistent.

## Verification

- `assets/objects/bounce-spring/SPEC.md` exists and is non-empty.
