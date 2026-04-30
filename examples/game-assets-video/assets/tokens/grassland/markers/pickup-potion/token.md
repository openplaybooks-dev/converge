---
id: pickup-potion
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
  beats: [pickup]
visual:
  symbol: "P"
  fill: "#E03E3E"
  material: "health potion pickup point"
  detail_density: low
  art_notes: |
    Gameplay marker for a health-potion pickup. Like `pickup-key`,
    the potion sprite itself is placed by the engine (objects.json
    ::health-potion); this token declares only position and kind.
    Painter shows a faint red glow halo for design-time visibility.
sketch:
  file: concept.png
  size_px: [1024, 1024]
---
