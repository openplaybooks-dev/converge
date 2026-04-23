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