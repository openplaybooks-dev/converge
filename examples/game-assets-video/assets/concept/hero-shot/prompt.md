Render a hero-shot demonstrating the art bible below. One mid-gameplay
framing — character on a representative environment, central composition,
clean background. Not a logo, not a splash screen, not a portrait — a
single illustrative game frame that future asset generation will reference
to stay visually consistent.

ART BIBLE (mandatory — every detail must match):

# Art Bible

## Palette
Dominant colors with hex values:
- Light Sky Blue: #AAD1F1 — top sky
- Sunset Yellow: #F3D9A1 — horizon sky
- Dirt Path Brown: #A58052 — foreground path
- Bright Grass Green: #76B44F — foreground grass
- Deep Forest Green: #44772D — tree foliage
- Distant Mountain Blue: #92A6B2 — background mountains
- Steel Blue: #5F8CA8 — knight armor
- Shadow Purple: #4F3260 — mage robe

Accent / highlight colors:
- Vibrant Red: #E03E3E — knight cape, potion liquid
- Potion Glow Yellow: #FDFFA6 — potion sparkles
- Magic Purple Glow: #C372F7 — mage eyes, staff gem
- Leather Brown: #876041 — knight shield, belt

## Line & shading
- Stroke weight: Soft 1-2px outline that thickens at silhouette breaks for important characters and objects, with lighter internal lines.
- Shading model: Cel shading with soft, subtle gradients for larger areas (sky, mountains, tree canopy) and simple, clean shadows for characters and objects, typically with a smooth internal gradient.
- Light direction: Above-front-right, single key light, creating soft shadows towards the left and rear.
- Highlights: Small, clean specular spots on reflective surfaces (armor, potion), focused glows for magical elements (mage eyes, staff), and subtle rim lighting on character edges from the main light source.

## Character proportions
- Head/body ratio: ~1:3 — chibi-leaning, larger heads, but still capable-looking.
- Hands/feet: Simplified, rounded, mitten-like for hands (no individual fingers visible). Feet are sturdy, rounded shapes, obscured by armor/robes.
- Face: Small dot eyes (knight), simple curved eyebrows, small, friendly smile. Mage has glowing, pupil-less purple eyes. Faces are rounded with soft chins.
- Outfit detail: Moderately detailed. Visible armor plates, cloth folds, weapon textures. Functional but not overly intricate or busy, maintaining a clean read.

## Environment & forms
- Common shape language: Organic and rounded forms dominate, especially for natural elements (trees, bushes, rocks). Characters also feature soft curves and rounded edges.
- Tree / foliage style: Lush, clumpy, and rounded canopies with visible leaf clusters. Tree trunks are sturdy and naturally textured. Bushes are similar, with soft, undulating forms.
- Stone / structure style: Smooth, rounded boulders and rocks, suggesting natural erosion, with subtle textural variations and highlights.
- Atmospheric depth: Pronounced atmospheric perspective. Distant elements (mountains, trees) are desaturated, lighter, and cooler in hue, creating a clear sense of depth and haze fade.

## Negatives (do NOT)
- No pixel art / 8-bit aesthetic — assets must have smooth edges and anti-aliasing.
- No jagged, sharp, or strictly geometric forms for natural elements.
- No photorealism, gritty textures, or overly dark/grungy art styles.
- No excessive use of heavy outlines or overly thick strokes, maintain a clean linework.
- No chromatic aberration, lens flares, or post-processing filters.
- No overly complex lighting or shading schemes; keep shadows and highlights clean and readable.
- No UI elements (e.g., health bars, buttons, text overlays) to be included in asset generation.
- No neon glow or saturated rim lighting from external sources (mage's internal glow is an exception).

GAME BRIEF (flavor only):

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

Composition rules:
- Single character, full body, side-on or 3/4 view, centered horizontally.
- Environment indicates the genre / setting at a glance.
- Lighting matches the bible's described light direction and shading model.
- Palette is restricted to the bible's listed colors (no off-palette).
- No text, no UI, no captions, no watermarks.

Aspect: 16:9. Clean digital rendering, game-engine output (not concept-art frames or border treatments). Every visible detail in this image becomes a reference target for asset generation downstream — so don't include effects we won't replicate per-asset (no lens flare, no atmospheric volumetrics, no motion blur).
