# Task: 03-shared-props/gold-key-01-spec

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