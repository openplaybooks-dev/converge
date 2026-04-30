# Scene Assembly Format

A scene is a list of tokens placed onto layers. The assembly file is
the LEGO instructions — pick tokens from the tokens library, place
them at positions on layers, and the framework builds the visual map
and hands it to image-gen.

Lives at `assets/scenes/{scene_id}/scene.assembly.json`.

## Format

```json
{
  "scene_id": "forest-tutorial",
  "biome": "grassland",
  "canvas": {
    "tile_size_px": 16,
    "concept_tile_px": 80,
    "grid_size": [120, 12]
  },
  "layers": [
    { "id": "bg-far", "depth": 0.1 },
    { "id": "bg-mid", "depth": 0.4 },
    { "id": "play",   "depth": 1.0 }
  ],
  "tokens": [
    { "token": "mountain-distant", "at": [0, 6],   "layer": "bg-far" },
    { "token": "mountain-distant", "at": [60, 5],  "layer": "bg-far" },
    { "token": "tree-cluster-mid", "at": [3, 8],   "layer": "bg-mid" },
    { "token": "tree-cluster-mid", "at": [22, 8],  "layer": "bg-mid" },
    { "token": "spawn",            "at": [2, 11],  "layer": "play" },
    { "token": "ground",           "at": [0, 11],  "layer": "play" },
    { "token": "ground",           "at": [5, 11],  "layer": "play" },
    { "token": "pond",             "at": [10, 10], "layer": "play" },
    { "token": "ground",           "at": [16, 11], "layer": "play" },
    { "token": "platform-wood",    "at": [12, 8],  "layer": "play" },
    { "token": "exit",             "at": [29, 11], "layer": "play" }
  ]
}
```

### Field meanings

| field | meaning |
|---|---|
| `scene_id` | unique scene id |
| `biome` | which `assets/tokens/{biome}/` directory to load tokens from |
| `canvas.tile_size_px` | gameplay tile size (collision grid) |
| `canvas.concept_tile_px` | concept tile size (visual map resolution = grid_size × concept_tile_px) |
| `canvas.grid_size` | scene dimensions in tiles `[width, height]` |
| `layers[]` | ordered back-to-front list of layers to build, with depth factors |
| `tokens[]` | flat list of token instances; the stamper routes each to its declared `layer` |
| `tokens[].token` | token id from the tokens library |
| `tokens[].at` | `[x_tile, y_tile]` in concept-tile units; refers to the token's anchor (default bottom-left) |
| `tokens[].layer` | which layer this instance belongs to; must be in `layers[].id` AND in the token's `layers[]` eligibility |

## Validation

The stamper checks:
- every token id in `tokens[]` exists in the biome tokens index
- every token instance's `layer` is in the scene's `layers[]`
- every token instance's `layer` is in the token's `layers` eligibility
- `at` coordinates keep the token's footprint within `grid_size`
- within a single layer, two tokens of the same gameplay category
  can't overlap (warns; doesn't refuse — overlap is sometimes desired
  for visual richness)

## Output

For each layer in `layers[]`, the stamper produces:

- `assets/scenes/{scene_id}/maps/{layer_id}.svg` — composed SVG with
  every token's sketch stamped at its position
- `assets/scenes/{scene_id}/maps/{layer_id}.png` — rasterized to
  `grid_size × concept_tile_px` resolution, ready for image-gen

The painter step then takes each `.png` and edits it into a finished
layer.
