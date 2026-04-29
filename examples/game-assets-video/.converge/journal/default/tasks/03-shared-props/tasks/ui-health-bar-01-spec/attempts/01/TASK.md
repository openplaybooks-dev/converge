# Task: 03-shared-props/ui-health-bar-01-spec

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