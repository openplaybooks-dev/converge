# Art Bible — Root Visual Grammar

The single binding art-style document for this project. Generic
visual grammar that applies to **every** asset (environments,
characters, props, UI, FX). Per-context bibles (CHARACTER_BIBLE.md,
etc.) layer specific data on top of this root.

## Palette

Project-wide palette family — warm earth and cool atmospheric tones,
saturated but not garish, with clean separation between sky / land /
foliage / accents.

Environment palette (binding for landscapes, scenes, props):

- Light Sky Blue: #AAD1F1 — upper sky / atmospheric haze
- Sunset Yellow: #F3D9A1 — horizon sky / warm highlights
- Dirt Path Brown: #A58052 — foreground earth, path, packed soil
- Bright Grass Green: #76B44F — foreground grass, mossy edges
- Deep Forest Green: #44772D — tree canopy, dense foliage shadow
- Distant Mountain Blue: #92A6B2 — far mountains, atmospheric mid-depth
- Leather Brown: #876041 — wood, weathered boulders, rim warmth

Accent family (used sparingly for points of interest):

- Vibrant Red: #E03E3E — pickup glow, key narrative color
- Potion Glow Yellow: #FDFFA6 — pickup sparkles, magical highlights
- Magic Purple Glow: #C372F7 — magical FX, eldritch hints

## Line & shading

- **Stroke weight:** Soft 1–2 px outlines that thicken slightly at
  silhouette breaks; lighter internal lines. Never heavy or strict.
- **Shading model:** Cel shading with soft, subtle gradients for
  large areas (sky, mountains, canopy); simple clean shadows for
  smaller forms. Smooth internal gradients, no harsh banding.
- **Light direction:** Above-front-right, single key light. Soft
  shadows fall toward the left and rear.
- **Highlights:** Small, clean specular spots on reflective surfaces;
  focused glows for magical elements; subtle rim lighting on edges
  from the main light source.

## Environment & forms

- **Shape language:** Organic and rounded. Soft curves dominate,
  especially for natural elements (trees, rocks, hills, water).
  Geometric forms only when justified by gameplay (platforms, ruins).
- **Trees / foliage:** Lush, clumpy, rounded canopies with visible
  leaf clusters. Sturdy trunks with natural texture. Bushes:
  undulating, soft mounds.
- **Stone / structure:** Smooth, rounded boulders suggesting natural
  erosion. Subtle texture variation. Highlights catch the key light.
- **Atmospheric depth:** Pronounced atmospheric perspective. Distant
  elements desaturated, lighter, cooler in hue. Near elements
  crisper, more saturated, warmer. Clear sense of haze fade between
  layers.
- **Ground / terrain:** Earth body extends from the contour line down
  to the canvas bottom — a real landscape volume, not a thin top
  slice. Grass tufts and foliage scatter along the contour as
  accents, never as a continuous strip.

## Negatives (do NOT)

- No pixel art / 8-bit aesthetic. Smooth edges, full anti-aliasing.
- No jagged, sharp, or strictly geometric forms for natural elements.
- No photorealism, gritty textures, or dark/grungy moods.
- No heavy outlines or thick strokes — keep linework clean.
- No chromatic aberration, lens flares, or post-processing filters.
- No complex lighting / shading schemes — shadows and highlights stay
  readable.
- No UI, HUD, text, or screen overlays in concept output.
- No neon or saturated rim lighting from external sources (the
  internal magical glow on accents is the only exception).
- No 16-bit retro tile look. No flat-vector / SVG appearance — every
  surface reads as painted.
