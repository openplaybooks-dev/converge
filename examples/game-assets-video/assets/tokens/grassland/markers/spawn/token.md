---
id: spawn
biome: grassland
category: marker
kind: dynamic
body:
  footprint: { width: 1, height: 1 }
  anchor: bottom-left
layers: [play]
gameplay:
  passable: true
  damage: 0
  beats: [spawn]
visual:
  symbol: "S"
  fill: "#88FFAA"
  material: "gameplay marker (invisible at runtime)"
  detail_density: low
  art_notes: |
    Gameplay marker. Visually invisible in the final scene — engine
    reads the spawn beat from the manifest and places the player here.
    The sketch shows a small visible cue only so designers can see
    where spawns landed during composition review.
sketch:
  file: concept.png
  size_px: [1024, 1024]
---
