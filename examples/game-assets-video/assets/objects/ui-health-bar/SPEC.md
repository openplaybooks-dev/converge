# Prop Spec: Horizontal Green Health Bar

- **ID**: ui-health-bar
- **Name**: Horizontal Green Health Bar
- **Category**: item

## Description

Horizontal green health bar.

## Visual Identity

Slim horizontal rectangular silhouette with a clear outer frame and an inner fill region, instantly readable as a HUD bar even at small sizes. Saturated green fill conveys positive/healthy state against a darker frame and crisp dark outline; palette stays disciplined within the project ART_BIBLE.md and avoids introducing colors outside the established game palette.

## Animation States

- `idle` — steady fill with a subtle pulsing sheen across the green bar, signaling an active, healthy reading.

## Category Behavior

- **item** — collected by player, despawns on collect.

## Technical Specifications

- Output directory: `assets/objects/ui-health-bar/`
- One sprite sheet / frame set per animation state listed above.
- Transparent background.
- Consistent pivot and frame size across all states.
- Palette: follow project ART_BIBLE.md.
