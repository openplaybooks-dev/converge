Style reference sheet for a 2D game asset library. ONE IMAGE, 3 columns × 2 rows.
Each of the 6 cells shows a single subject centered on a transparent or neutral background.
The cells share ONE consistent rendering style — same line weight, same palette, same shading
language, same level of detail. This sheet will be used as the visual anchor for every
downstream asset generation call, so style consistency is the entire purpose of this image.

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

ART STYLE (mandatory, all 6 cells):
Modern hand-drawn 2D game art in the spirit of Studio Ghibli and contemporary indie titles like Hollow Knight, Hades, Spiritfarer, Cuphead, and Ori and the Blind Forest. Soft painterly shading, gentle gradients, clean rounded silhouettes, expressive eyes and faces, warm storybook lighting. Characters have appealing proportions (slightly stylized: larger heads, simplified bodies) and read as friendly and inviting at first glance. Color is rich and saturated but not garish — think watercolor + ink, not pixel art. Edges are smooth (no jaggies). Subtle ambient rim light hints at depth without heavy shadows.

PALETTE:
Modern saturated palette with painterly gradients (NOT a fixed 16-color limit). Use subtle color variation within each material — e.g. armor highlights pick up sky/ambient tints. Skin tones are warm and natural.

LAYOUT (3 columns × 2 rows, cell size 512×512 px):

ROW 1 — sample props (top row):
- Cell (1,1): Red flask with sparkle particles
- Cell (1,2): Ornate golden key with gem inset
- Cell (1,3): User interface slot for the gold key

ROW 2 — sample terrain tiles (bottom row):
- Cell (2,1): grass: Plain grass field tile (top-down view).
- Cell (2,2): grass-flowers: Grass with scattered flower spots.
- Cell (2,3): dirt: Plain dirt tile.

CRITICAL CONSISTENCY RULES (this is the whole point of the sheet):
- All 6 cells must share IDENTICAL rendering style — same brush, same line weight, same shading model.
- Use the SAME palette across all 6 cells. Pick a small set of hues and reuse them.
- Each subject is centered in its cell with comparable scale (props occupy ~70% of cell; tiles fill cell edge-to-edge).
- Props (top row): subjects on a flat soft-grey background or transparent; soft drop shadow; no scenery behind them.
- Tiles (bottom row): edge-to-edge fills designed to TILE — left/right edges of adjacent cells in the same row should match if placed next to each other.
- Lighting source consistent across all cells (top-left soft key light suggested).

DO NOT (negative directives):
- Do NOT produce pixel art, 8-bit, or 16-bit retro game graphics
- Do NOT use a hard-edged limited color palette, dithering, or visible chunky pixels
- Do NOT use the chunky aliased outlines typical of NES/SNES sprites
- Do NOT add any captions, labels, frame numbers, watermarks, or annotations on the sheet.
- Do NOT draw extra content beyond the 6 specified subjects.
- Do NOT vary the rendering style between cells — that defeats the entire purpose.
