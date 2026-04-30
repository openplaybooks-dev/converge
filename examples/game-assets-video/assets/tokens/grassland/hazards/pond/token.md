---
id: pond
biome: grassland
category: hazard
kind: terrain
body:
  footprint: { width: 6, height: 1 }
  anchor: bottom-left
layers: [play]
gameplay:
  passable: false
  damage: 1
  beats: [hazard]
visual:
  symbol: "W"
  fill: "#3A6FAA"
  material: "wetland water"
  detail_density: medium
  art_notes: |
    A small wetland pond with grass shoreline. Reeds along the left
    and right edges, lily pads centered, calm reflective surface.
    Mud bank where water meets grass. No waves, no foam — still water.
sketch:
  file: concept.png
  size_px: [1024, 171]
---
