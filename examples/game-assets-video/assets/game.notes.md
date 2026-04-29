# Game Classification — top-down-rpg

**Confidence**: 0.95

## Reasoning

`idea.md` explicitly describes the hero with "8-directional movement", a tile-based grassland terrain (16x16 tiles), and a 16-bit retro pixel-art aesthetic. The cast (knight, elf, mage with idle+walk states) and collectible items (health potion, gold key) are characteristic RPG content. While `idea.md` mentions one parallax "Forest Path" background, the dominant signals classify this as **top-down-rpg**.

## Art Style Keywords

- pixel art
- 16-bit
- retro RPG
- tile-based
- limited 16-color palette
- saturated character colors
- muted environment tones

## Anti-Keywords

- side view
- parallax
- horizon
- depth haze
- modern 3D
- high-resolution
- photorealistic

## Movement

- 8-directional

## Downstream Implications

- **Tilemap style**: `8-direction-rpg` (not platform-shelves)
- **Background**: disabled — top-down RPGs don't use parallax bg layers
- **Character states**: 8 directional idle/walk states per character
- **Inspect viewer**: top-down mode, no floating platforms
