Painted concept image for ONE design token in a 2D side-scrolling
game. ONE IMAGE, solid uniform chroma-green background (#00FF00),
single subject filling the canvas.

This is a CONCEPT REFERENCE — not a finished sprite, not a finished scene.
The image's only job is to show painters what `exit` looks like in
this project's target style. Downstream tooling stamps this image into
per-layer scene maps; the painter then edits those maps into finished art.

TOKEN SPEC:
  id:           `exit`
  biome:        `grassland`
  category:     `marker`
  footprint:    1×1 concept tiles (image aspect = 1:1)
  primary fill: `#FFAA44`
  material:     gameplay marker (invisible at runtime)
  detail:       low

CAMERA (mandatory — overrides any token art_notes that imply a flat profile or different angle):
Side-scroller camera tilted ~30° down from horizontal (~120° from straight-up) and pushed slightly forward of the subject. Every painted concept (token, landscape, hero-shot, style sheet) reads with a hint of dimensionality from this angle: a visible top surface PLUS a visible side face. Grounds and platforms show a top surface with a body falling away below it (cartoon-platformer chunk of land, NOT a thin cross-section strip). Trees, rocks, pickups all sit at this slight 3/4-perspective angle. This camera is the binding visual contract for the project — every generator must honor it for cross-asset consistency.

ART NOTES (the painter's intent for this token; honor where they don't conflict with CAMERA):
Gameplay marker for level exit. Visually invisible at runtime;
engine handles the transition. Sketch shows a visible cue for
composition review.

ART STYLE (mandatory):
Modern hand-drawn 2D game art in the spirit of Studio Ghibli and contemporary indie titles like Hollow Knight, Hades, Spiritfarer, Cuphead, and Ori and the Blind Forest. Soft painterly shading, gentle gradients, clean rounded silhouettes, expressive eyes and faces, warm storybook lighting. Characters have appealing proportions (slightly stylized: larger heads, simplified bodies) and read as friendly and inviting at first glance. Color is rich and saturated but not garish — think watercolor + ink, not pixel art. Edges are smooth (no jaggies). Subtle ambient rim light hints at depth without heavy shadows.

PALETTE:
Modern saturated palette with painterly gradients (NOT a fixed 16-color limit). Use subtle color variation within each material — e.g. armor highlights pick up sky/ambient tints. Skin tones are warm and natural.

ART BIBLE EXCERPT (binding visual rules):
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

VISUAL REFERENCES ATTACHED (the token must MATCH THEIR PAINTING STYLE,
NOT their composition or backgrounds — the references are full scenes;
your output is a single subject on a flat green background):
- Image #1: this biome's landscape concept — match its painterly finish,
  palette mix, and atmospheric language. The token must look like it
  came from the same painter as that landscape, but isolated on the
  flat chroma-green matte.
- Image #2: project style sheet — match brushwork, line weight, shading.
- Image #3: project hero-shot — secondary style anchor.

CRITICAL CONSTRAINTS:
- SOLID UNIFORM CHROMA-GREEN BACKGROUND. Every pixel that is not part
  of the token's silhouette must be the SAME flat shade of chroma green
  (target #00FF00 / pure RGB 0,255,0). No gradients, no atmospheric
  haze around the subject, no shadows cast onto the background, no
  vignetting. The background is a flat keyable matte — downstream we
  remove it via chroma-key to produce the alpha channel.
- Token colors must NOT use chroma green or near-greens that the
  matter would key out. If the token is naturally green (grass, leaves),
  prefer the project palette's saturated greens (deep forest, olive)
  with clear separation from #00FF00 — do NOT paint the subject in
  pure 0,255,0.
- Single subject filling the canvas — no scene composition, no
  characters, no UI/text/captions/watermarks/labels.
- Honor the footprint aspect ratio: the token's natural shape fills
  the canvas (a 6×2 pond reads wide-and-short; a 1×1 marker reads
  square; a 4×6 branch-frame reads tall-and-wide).
- Honor the primary fill color #FFAA44 and the project palette. Use
  1–2 secondary colors from the project's ART_BIBLE palette for
  highlights/shadows.
- Painted finish, not flat vector. Visible brushwork or atmospheric
  shading is the point — that's why we're replacing the SVG sketch.
- The subject occupies ~85% of the canvas; small breathing room
  around the edges so the silhouette reads cleanly.

DO NOT (negative directives):
- Do NOT produce pixel art, 8-bit, or 16-bit retro game graphics
- Do NOT use a hard-edged limited color palette, dithering, or visible chunky pixels
- Do NOT use the chunky aliased outlines typical of NES/SNES sprites
- No text, captions, labels, frame numbers, watermarks, or annotations.
- No grid lines, no footprint overlay, no debug markings.
- No characters, sprites, NPCs, player figures.
- No UI, HUD, or game interface elements.
- No multi-cell layouts (one token, one canvas).

