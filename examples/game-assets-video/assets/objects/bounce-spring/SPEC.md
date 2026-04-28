# Coil Spring — SPEC

**ID**: bounce-spring
**Category**: interactive
**States**: idle, bounce

## Visual Identity

A short metal coil spring anchored to a square floor plate, rendered with a tight silhouette that reads clearly at sprite scale. Polished steel coils (cool grey midtones with a single highlight band) sit on a darker bolted base plate, keeping the palette disciplined to two greys plus a warm rivet accent — no extraneous hues that would compete with character or hazard sprites in the same scene.

## Per-State Animation Intent

- **idle** — Coils hold their resting height with a faint, slow vertical breathing wobble so the prop reads as live without drawing the eye.
- **bounce** — Coils compress sharply onto the base plate, then snap upward past their resting height before settling, selling the launch impulse in a single readable arc.

## Category Behavior — interactive

Triggered by player action (contact from above); the spring transitions idle → bounce, applies an upward impulse to the player, and returns to idle. The prop is **persistent** — it is not consumed and remains in the scene for repeated use.
