# Health Potion — SPEC

**ID**: health-potion
**Category**: item
**States**: idle, collect

## Visual Identity

A small glass flask with a rounded body, narrow neck, and corked stopper, filled with a vivid red liquid that reads instantly as "healing" at sprite scale. The silhouette stays distinct from coins and keys through the bottle profile, and the palette is held tight to two reds (deep crimson body, bright cherry highlight) plus a muted glass rim and cork brown — sparkle particles use a single warm white so they pop without introducing new hues that would compete with characters or hazards.

## Per-State Animation Intent

- **idle** — The flask hovers with a gentle vertical bob while the liquid surface ripples subtly and a few sparkle particles drift upward around it on a slow loop, signaling "pickup" without overwhelming motion.
- **collect** — The flask flashes brighter, releases a quick burst of sparkles outward, and fades out as it despawns, selling the heal pickup in a single readable beat.

## Category Behavior — item

Collected by the player on contact; the prop transitions idle → collect, restores health to the player, and **despawns** at the end of the collect animation. The prop is not persistent and does not remain in the scene after pickup.
