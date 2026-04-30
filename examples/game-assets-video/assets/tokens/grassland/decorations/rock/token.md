---
id: rock
biome: grassland
category: decoration
kind: terrain
body:
  footprint: { width: 1, height: 1 }
  anchor: bottom-left
layers: [play]
gameplay:
  passable: true
  damage: 0
  beats: []
visual:
  symbol: "r"
  fill: "#7A6F5A"
  material: "smooth grey boulder"
  detail_density: low
  art_notes: |
    A single smooth grey boulder, 1 tile in size. Sits on the ground
    as decoration; the player walks past it (passable). Rounded form
    with a soft highlight on the upper-right and a small ground
    shadow on the lower-left. Use for breaking up long flat stretches
    of `ground` without changing the gameplay shape.
sketch:
  file: concept.png
  size_px: [1024, 1024]
---
