# Aether's Edge

A small-team 3D action-RPG concept — three character classes (warrior, mage, ranger) exploring a fallen-kingdom world dotted with ruins and bioluminescent forests.

## Pitch context

- **Genre**: 3D action-RPG, third-person
- **Audience**: indie players who liked Hades and Tunic; small studios pitching publishers
- **Vertical-slice goal**: 5 fully-rigged + animated character GLBs sharing a coherent visual style, ready to drop into Unity / Unreal / Godot / three.js

## Art direction

- **Style**: stylized low-poly with soft PBR textures, hand-painted feel
- **Palette**: muted earth tones (deep teal, moss green, weathered bronze, bone white), one warm accent (amber #f0a050) used sparingly for class-defining elements (warrior's emblem, mage's staff crystal, ranger's quiver feathers)
- **Mood**: melancholy, hopeful, fallen-civilization

## Required characters

The vertical slice needs five characters across three classes. Every character must read as belonging to its class — silhouette, material, accent placement.

### Warrior

- **hero-knight**: Sir Aldric, an armored knight with blue steel plate armor, a red cape, and a longsword at his hip. Stands ~1.85m tall. Dominant: blue steel + silver. Secondary: deep red on the cape. No gold on armor plates; gold only on a small heraldic emblem on the chest.
- **enemy-marauder**: a brutish raider in patchwork iron armor, a crude two-handed axe, dark leather underlayer. Imposing, hulking silhouette. Worn rusted metal, dark browns and rust-orange.

### Mage

- **forest-druid**: Lyra, a mage in flowing deep-green and brown robes, holding a wooden staff topped with a glowing amber crystal. Soft fabric, weathered leather belt, no metal armor.
- **storm-conjurer**: an older male mage in dark teal robes with silver embroidery, holding a tall iron staff with a pale-blue crystal. Long beard, hooded silhouette.

### Ranger

- **forest-scout**: Kira, a ranger in brown leather armor with a dark green hood, carrying a longbow and a quiver with amber-tipped feathers. Slim, agile silhouette. Earth-tone palette.

## Required environment props

Static (non-rigged) environment dressing — generated via the same Meshy pipeline as characters but without rigging or animations. Used to populate the scene viewer.

- **prop-rock**: a weathered moss-covered boulder, low-poly, dark gray with green moss patches
- **prop-tree-stump**: a low broken tree stump with bark and exposed wood rings, slightly burnt edges
- **prop-crate**: a wooden supply crate, slightly tilted, weathered planks with iron bands
- **prop-lantern**: a small hanging glass lantern with an amber flame inside, wrought-iron frame

## Environment

- **terrain**: a tilemap-style low-poly arena, 8×8 grid of square tiles, each tile slightly displaced in height for soft hills. Walkable flat area in the centre, perimeter dotted with the props above.
- **skybox**: gradient from deep teal (top) to soft amber (horizon).
- **lighting**: warm amber directional sun + cool teal ambient; soft shadows.

## Notes

- Every character is humanoid and must be auto-rigged.
- Every character needs at minimum: Idle, Walk. Combat-coded characters get a class-appropriate action clip (Attack for warriors, CastSpell for mages, BowDraw for rangers).
- Environment props are non-rigged and skip tasks 06-meshy-rig and 07-meshy-animate.
- The scene viewer (`viewer/scene.html`) places every character on the terrain with orbit camera, plays each character's Idle clip on loop, and scatters the props for visual interest.
