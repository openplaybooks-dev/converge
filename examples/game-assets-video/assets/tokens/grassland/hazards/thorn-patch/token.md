---
id: thorn-patch
biome: grassland
category: hazard
kind: terrain
body:
  footprint: { width: 2, height: 1 }
  anchor: bottom-left
layers: [play]
gameplay:
  passable: true
  damage: 2
  beats: [hazard]
visual:
  symbol: "^"
  fill: "#A03A3A"
  material: "thorny brambles"
  detail_density: medium
  art_notes: |
    Tangled patch of dark thorny brambles, 2 tiles wide. Sits on top
    of the ground (passable but damaging — the player CAN walk
    through but takes damage). Spiky silhouette with reddish-brown
    stems and small dark thorns. Distinct from water hazards: dry,
    rough, prickly rather than wet.
sketch:
  file: concept.png
  size_px: [1024, 512]
---
