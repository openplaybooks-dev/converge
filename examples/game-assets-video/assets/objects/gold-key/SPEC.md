# Gold Key — SPEC

**ID**: gold-key
**Category**: item
**States**: idle, collect

## Visual Identity

An ornate golden key with a clear bow-shaft-bit silhouette that reads instantly at sprite scale, distinguishing it from coins or generic pickups. A single gem inset on the bow adds a focal accent against warm gold midtones with one bright highlight along the shaft, keeping the palette tight to two golds plus the gem hue — no extra colors that would compete with characters or hazards sharing the scene.

## Per-State Animation Intent

- **idle** — The key hovers with a slow vertical bob and a subtle rotational sway, with the gem catching a soft periodic glint to draw the eye without flashing.
- **collect** — The key pops upward briefly, brightens with a quick sparkle burst, then fades out as it despawns, selling the pickup in a single readable beat.

## Category Behavior — item

Collected by the player on contact; the prop transitions idle → collect, awards the key to the player, and **despawns** at the end of the collect animation. The prop is not persistent and does not remain in the scene after pickup.
