# Floor Spikes — SPEC

**ID**: spike-trap
**Category**: hazard
**States**: idle, trigger

## Visual Identity

A square stone floor block with a row of iron spikes that extend from slots along its top face, kept to a tight silhouette so the hazard reads instantly even at sprite scale. The stone base uses two cool greys with subtle bevel shading, while the spikes are a darker iron with a single cold highlight band — palette held to greys and iron tones, with no warm or saturated hues that would compete with characters or items in the same scene.

## Per-State Animation Intent

- **idle** — Spikes sit fully retracted into the stone block with only their tips flush at the surface, the block resting still so the prop reads as inert and safe to traverse.
- **trigger** — Spikes snap upward to full extension in a single sharp beat, hold briefly with a faint vibration, then retract back into the slots, selling the lethal strike in one readable arc.

## Category Behavior — hazard

Damages the player on contact while in the active (extended) trigger state; the prop transitions idle → trigger on its cycle and returns to idle. The prop is **persistent** — it is not consumed and remains in the scene for repeated activation.
