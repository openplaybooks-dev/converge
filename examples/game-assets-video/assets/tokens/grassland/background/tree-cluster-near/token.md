---
id: tree-cluster-near
biome: grassland
category: background
kind: terrain
body:
  footprint: { width: 4, height: 5 }
  anchor: bottom-left
layers: [bg-mid, fg]
gameplay:
  passable: true
  damage: 0
  beats: []
visual:
  symbol: "t"
  fill: "#44772D"
  material: "broadleaf tree cluster, foreground saturation"
  detail_density: medium
  art_notes: |
    A larger, closer cluster of broadleaf trees with deeper green
    foliage and visible trunk shadows. Eligible for both bg-mid and
    fg layers — when placed on fg the painter applies slight focus
    blur and pulls toward near-silhouette. Compared to
    `tree-cluster-mid`: bigger footprint (4w-5h), darker greens
    (Deep Forest Green palette), more trunk visibility.
sketch:
  file: concept.png
  size_px: [819, 1024]
---
