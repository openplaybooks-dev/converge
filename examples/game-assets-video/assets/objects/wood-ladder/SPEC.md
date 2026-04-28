# Wooden Ladder — SPEC

**ID**: wood-ladder
**Category**: interactive
**States**: idle

## Visual Identity

A vertical wooden ladder with two parallel rails and evenly spaced rungs, fastened at every joint with dark iron rivets that catch a single highlight. The silhouette reads as a clean upright rectangle with regular horizontal banding, keeping the palette disciplined to warm wood midtones plus a cool iron accent — no extra hues that would compete with characters or hazards sharing the scene.

## Per-State Animation Intent

- **idle** — Rails and rungs hold completely static; only the faintest ambient grain shimmer keeps the prop from looking like a frozen still, preserving its role as a stable climbable surface.

## Category Behavior — interactive

Triggered by player action (contact and climb input); the ladder lets the player traverse vertically along its length without changing state. The prop is **persistent** — it is not consumed and remains in the scene for repeated use.
