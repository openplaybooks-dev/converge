# Prop Spec: User Interface Slot For The Gold Key

- **ID**: ui-key-slot
- **Name**: User Interface Slot For The Gold Key
- **Category**: item

## Description

User interface slot for the gold key.

## Visual Identity

Compact square HUD slot with a clear outer frame and an empty inner socket sized to receive the gold key icon, instantly readable as a single-item inventory cell at small sizes. Muted neutral frame with a darker recessed interior keeps focus on the key when collected; palette stays disciplined within the project ART_BIBLE.md and avoids introducing colors outside the established game palette.

## Animation States

- `idle` — empty socket with a subtle inner highlight cycling along the frame edge, signaling an awaiting, ready-to-receive slot.

## Category Behavior

- **item** — collected by player, despawns on collect.

## Technical Specifications

- Output directory: `assets/objects/ui-key-slot/`
- One sprite sheet / frame set per animation state listed above.
- Transparent background.
- Consistent pivot and frame size across all states.
- Palette: follow project ART_BIBLE.md.
