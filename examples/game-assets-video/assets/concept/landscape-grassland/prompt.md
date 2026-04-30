Wide painterly establishing shot for the `grassland` biome of a 2D side-scrolling
game. ONE IMAGE, 3:2 aspect, 1536×1024 px. This image is the binding
visual reference for every painted scene authored in this biome — it locks the
biome's atmosphere, palette, and form vocabulary in one piece of art.

GAME BRIEF (for context only, do not draw scene content):
# Game Assets Idea

## Game Concept
A 2D pixel art action RPG with 16-bit retro aesthetics. Game uses a limited 16-color palette with emphasis on bright, saturated colors for characters against muted environmental tones.

## Characters

### 1. Hero Knight
- **ID**: hero-knight
- **Name**: Sir Aldric
- **Description**: Armored knight with blue steel armor, red cape, and sword and shield. Hero character with 8-directional movement.
- **Palette**: 16-bit retro, blue and silver armor, red accent, limited to 16 colors
- **States**: idle, walk

### 2. Forest Elf
- **ID**: forest-elf
- **Name**: Lirael
- **Description**: Nimble elf with green cloak, pointed hat, and bow. Quick movements, graceful poses.
- **Palette**: 16-bit retro, green and brown tones, natural forest colors, limited to 16 colors
- **States**: idle, walk

### 3. Shadow Mage
- **ID**: shadow-mage
- **Name**: Malachar
- **Description**: Dark robed mage with glowing purple eyes and staff. Mysterious, flowing robe animations.
- **Palette**: 16-bit retro, dark purple and black, magical glow effects, limited to 16 colors
- **States**: idle, walk

## Objects

### 1. Health Potion
- **ID**: health-potion
- **Type**: item
- **Description**: Red flask with sparkle particles, restores health when collected.
- **States**: idle, collect

### 2. Gold Key
- **ID**: gold-key
- **Type**: item
- **Description**: Ornate golden key with gem inset, unlocks treasure chests.
- **States**: idle, collect

## Backgrounds

### 1. Forest Path
- **ID**: forest-path
- **Description**: Parallax forest background with distant trees, mid-ground bushes, and foreground grass details.
- **Layer**: mid
- **Resolution**: 1920x1080

## Tile Maps

### 1. Grassland Terrain
- **ID**: grassland
- **Terrain**: grass
- **Tile Size**: 16x16
- **Layers**: base grass, detail flowers, decoration stones

## Technical Requirements

- Sprite Resolution: 128x128 pixels per frame
- Animation Frames per State: 4 (idle), 8 (walk) — test with 4 each
- Engine Targets: godot, unity, raw
- Sprites Per Row: 4

## Palette Constraints

All sprites must strictly adhere to a 16-color retro palette:
- Primary: Black, White, Dark Gray, Light Gray
- Accent 1: Red, Orange, Yellow
- Accent 2: Green, Teal, Cyan
- Accent 3: Blue, Purple, Magenta
- Special: Skin tone, Brown (wood/leather)

BIOME: `grassland`

CAMERA (mandatory — every painted asset in this project shares this viewing angle):
Side-scroller camera tilted ~30° down from horizontal (~120° from straight-up) and pushed slightly forward of the subject. Every painted concept (token, landscape, hero-shot, style sheet) reads with a hint of dimensionality from this angle: a visible top surface PLUS a visible side face. Grounds and platforms show a top surface with a body falling away below it (cartoon-platformer chunk of land, NOT a thin cross-section strip). Trees, rocks, pickups all sit at this slight 3/4-perspective angle. This camera is the binding visual contract for the project — every generator must honor it for cross-asset consistency.

ART STYLE (mandatory):
Modern hand-drawn 2D game art in the spirit of Studio Ghibli and contemporary indie titles like Hollow Knight, Hades, Spiritfarer, Cuphead, and Ori and the Blind Forest. Soft painterly shading, gentle gradients, clean rounded silhouettes, expressive eyes and faces, warm storybook lighting. Characters have appealing proportions (slightly stylized: larger heads, simplified bodies) and read as friendly and inviting at first glance. Color is rich and saturated but not garish — think watercolor + ink, not pixel art. Edges are smooth (no jaggies). Subtle ambient rim light hints at depth without heavy shadows.

PALETTE:
Modern saturated palette with painterly gradients (NOT a fixed 16-color limit). Use subtle color variation within each material — e.g. armor highlights pick up sky/ambient tints. Skin tones are warm and natural.

ART BIBLE EXCERPT (the project's binding visual rules):
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

LAYOUT — a wide landscape with clear parallax depth, back-to-front:
- Sky / atmosphere fills the top third — color temperature and time of day
  appropriate to this biome.
- Distant silhouettes (mountains, far tree bands, distant ruins) at ~15-30%
  height from the top — desaturated, atmospheric haze applied.
- Mid-distance forms (tree clusters, hills, mid-distance structures) at
  ~40-60% height — softer detail than foreground but readable.
- Ground line / play layer at ~70-85% height — the surface a player would
  walk on, sharp and saturated. Grass / dirt / rock / water as appropriate
  to the biome.
- Foreground frame element on one side (a branch, vines, a column) — near
  silhouette, slight focus blur, darker palette. Frames the camera.

CRITICAL CONSTRAINTS:
- NO characters. NO player. NO enemies. NO UI / HUD / text. NO captions.
- NO gameplay tokens — no platforms, no spike traps, no pickups, no spawn
  markers. This is pure landscape concept art, not a level layout.
- The image's job is to show the painter what the biome LOOKS LIKE in this
  project's style. Tokens come later from a separate library.
- Honor the ART_BIBLE palette exactly. Match the rendering style of the
  reference images (style-sheet, hero-shot, visual-target) on every detail.
- Atmospheric depth: distant elements desaturated and cooler; near elements
  saturated and crisper.

DO NOT (negative directives):
- Do NOT produce pixel art, 8-bit, or 16-bit retro game graphics
- Do NOT use a hard-edged limited color palette, dithering, or visible chunky pixels
- Do NOT use the chunky aliased outlines typical of NES/SNES sprites
- Do NOT add captions, labels, frame numbers, watermarks, or annotations.
- Do NOT include any character or sprite-like content.
- Do NOT depict gameplay mechanics (jumps, hazards, collectibles).
