---
id: branch-frame
biome: grassland
category: decoration
kind: terrain
body:
  footprint: { width: 4, height: 6 }
  anchor: top-left
layers: [fg]
gameplay:
  passable: true
  damage: 0
  beats: []
visual:
  symbol: "Y"
  fill: "#876041"
  material: "drooping foreground branch with leaves"
  detail_density: medium
  art_notes: |
    A drooping branch with leaves hanging from the top of the camera
    frame — sits in front of the playable area on the fg layer.
    Anchored at top-left so the token's `at` position is the corner
    where the branch enters the canvas. Painter applies slight
    focus blur and pulls toward near-silhouette (darker than the
    play layer's foliage). Use to frame the camera at scene edges.
sketch:
  file: concept.png
  size_px: [683, 1024]
---
