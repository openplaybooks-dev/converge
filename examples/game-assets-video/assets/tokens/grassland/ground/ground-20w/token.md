---
id: ground-20w
biome: grassland
category: ground
kind: terrain
body:
  footprint: { width: 20, height: 1 }
  anchor: bottom-left
layers: [play]
gameplay:
  passable: false
  damage: 0
  beats: []
visual:
  symbol: "@"
  fill: "#5B3B1C"
  material: "grassy soil"
  detail_density: medium
  art_notes: |
    Very long run of grassy ground, 20 tiles wide. Use for the big
    uninterrupted stretches where the player walks for a while
    between gameplay events. Same look as `ground-10w` and shorter
    variants — continuous grass top edge, packed-dirt body, subtle
    waviness in the grass blades. Distinct symbol so it doesn't
    merge with adjacent `ground-10w` regions during compile.
sketch:
  file: concept.png
  size_px: [1024, 51]
---
