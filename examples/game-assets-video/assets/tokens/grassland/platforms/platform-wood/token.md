---
id: platform-wood
biome: grassland
category: platform
kind: terrain
body:
  footprint: { width: 4, height: 1 }
  anchor: bottom-left
layers: [play]
gameplay:
  passable: false
  damage: 0
  beats: [platform-up]
visual:
  symbol: "="
  fill: "#7A6F5A"
  material: "weathered wooden ledge with grass top"
  detail_density: low
  art_notes: |
    Floating wooden platform the player can land on. Top edge is a
    thin grass-topped lip; the body is a single horizontal wooden
    plank. No support posts — reads as suspended in air. Soft drop
    shadow on the underside if lighting calls for it.
sketch:
  file: concept.png
  size_px: [1024, 256]
---
