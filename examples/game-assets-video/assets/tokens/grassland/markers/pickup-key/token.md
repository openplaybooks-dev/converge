---
id: pickup-key
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
  symbol: "K"
  fill: "#FDFFA6"
  material: "gold key pickup point"
  detail_density: low
  art_notes: |
    Gameplay marker for a gold-key pickup. The key sprite itself is
    placed by the engine (it's a separate animated prop from
    objects.json::gold-key); this token declares only the position
    and kind. Painter shows a faint warm glow halo so designers can
    see where pickups landed during composition review — the engine
    overrides this in-game.
sketch:
  file: concept.png
  size_px: [1024, 1024]
---
