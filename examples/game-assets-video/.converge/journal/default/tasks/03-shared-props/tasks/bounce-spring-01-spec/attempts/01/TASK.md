# Task: 03-shared-props/bounce-spring-01-spec

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