---
id: exit
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
  beats: [exit]
visual:
  symbol: "X"
  fill: "#FFAA44"
  material: "gameplay marker (invisible at runtime)"
  detail_density: low
  art_notes: |
    Gameplay marker for level exit. Visually invisible at runtime;
    engine handles the transition. Sketch shows a visible cue for
    composition review.
sketch:
  file: concept.png
  size_px: [1024, 1024]
---
