# Prop Spec: Red Flask With Sparkle Particles

- **ID**: health-potion
- **Name**: Red Flask With Sparkle Particles
- **Category**: item

## Description

Red flask with sparkle particles.

## Visual Identity

Rounded flask silhouette with a clearly readable neck and stopper, recognizable at small sizes. Saturated crimson liquid dominates the body with bright sparkle accents and a crisp dark outline; palette stays disciplined within the project ART_BIBLE.md and avoids introducing colors outside the established game palette.

## Animation States

- `idle` — gentle hover with subtle liquid sway and intermittent sparkle particles, signaling pickup affordance.

## Category Behavior

- **item** — collected by player, despawns on collect.

## Technical Specifications

- Output directory: `assets/objects/health-potion/`
- One sprite sheet / frame set per animation state listed above.
- Transparent background.
- Consistent pivot and frame size across all states.
- Palette: follow project ART_BIBLE.md.
