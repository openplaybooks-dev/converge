---
scene_id: demo-grassland
biome: grassland
canvas:
  tile_size_px: 16
  concept_tile_px: 80
  grid_size: [120, 12]
layers:
  - { id: bg-far, depth: 0.1 }
  - { id: bg-mid, depth: 0.4 }
  - { id: play,   depth: 1.0 }
  - { id: fg,     depth: 1.6 }
mappings:
  - mappings/bg-far.md
  - mappings/bg-mid.md
  - mappings/play-terrain.md
  - mappings/play-dynamic.md
  - mappings/fg.md
---

# Visual Mapping: Demo Grassland

A 120-tile-wide grassland scene that exercises every category of the
grassland tokens library across all four parallax layers. Used as
the worked example for the modern-side-scroll spec.

The scene reads left-to-right as a tour of the tokens library:
spawn → first puddle (teaches jump) → bumpy ground + key on a narrow
platform → wide platform with a potion above a pond → thorn-patch
hazard → final stretch with a second bumpy ground → exit.

The `play` parallax layer is split into two files:

- **`play-terrain.md`** — static terrain on a 12×120 ASCII grid.
  Decorations (rocks, flowers, bushes, thorn-patches) replace ground
  at their cells; the grid shows what's actually at each cell.
- **`play-dynamic.md`** — engine-driven props at point coords.
  No grid; just a YAML list of dynamic spawns. Spawn / exit / pickups.

Background layers (`bg-far`, `bg-mid`, `fg`) each have a single
terrain mapping file with one ASCII grid.
