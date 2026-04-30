# Modern Side-Scroll Scene Spec

A design language for describing modern 2D side-scrolling game scenes
in a way that humans author and AI executes. "Modern" here means the
visual category established by *Hollow Knight*, *Ori and the Blind
Forest*, and *Dead Cells* — painterly or cohesively-rendered
backgrounds, parallax depth as the default, tile-based collision
hidden behind painted scenery, explicit lighting, and animated
environment elements. Not the flat-tile look of 8/16-bit platformers.

This doc defines:
1. The **tokens library** — a reusable design-token set per biome.
2. The **scene assembly** — how tokens compose into a scene.
3. The **per-layer painting flow** — how the AI turns the assembled
   visual map into finished art.
4. The **end-to-end pipeline** — what scripts run, in what order, for
   what cost.

The model is LEGO. Tokens have a body, a sketch, and visual attributes.
A scene is a list of token instances placed onto layers. The framework
stamps the assembly into per-layer visual maps; AI image-edit turns
each map into finished painted art; the framework composites the
painted layers into the final scene.

---

## 1. Reference games (the visual targets)

The schema below is anchored to three games. When the schema is
ambiguous, defer to what these games actually do.

### 1.1 Hollow Knight (Team Cherry, 2017)
- Gothic, hand-illustrated, mostly desaturated.
- 4–5 parallax layers per scene typical. Far layers blurred; near
  layers crisp.
- Tile-based collision visually hidden — the painted `play` layer's
  ground edge is drawn organically over a hard tile grid.
- Strong silhouettes; lots of dark foreground masses framing the
  playfield.
- Explicit point-light sources (lanterns, glow-mushrooms).
- Foreground frame layer: vines, columns, gates the player passes
  behind.

### 1.2 Ori and the Blind Forest (Moon Studios, 2015)
- Painterly, vibrant, saturated.
- 6–8 parallax layers in many scenes — extreme depth.
- God rays and particle drift in every scene as ambient layer.
- Animated environment per layer: swaying foliage, drifting clouds.
- Strong color-temperature shifts between scenes.

### 1.3 Dead Cells (Motion Twin, 2018)
- Pixel-art rendered with modern lighting and post-processing.
- 3–4 parallax layers — fewer than the others.
- Explicit dynamic lighting (player carries a light source).
- Less foreground decoration than Hollow Knight; more readable
  gameplay space.

These three define the design space. A pipeline that can produce a
Hollow Knight scene, an Ori scene, AND a Dead Cells scene from the
same authoring workflow is doing its job.

---

## 2. The split: human writes spec, LLM produces mapping, framework
   executes images

Three roles, three artifact types:

| Author | Artifact | Stage |
|---|---|---|
| Human | `assets/tokens/{biome}/{category}/*.md` + `*.sketch.svg` | tokens library |
| Human (or LLM) | `scene.assembly.json` | scene composition |
| Framework | `maps/{layer}.png` | stamped visual map |
| AI image-edit | `layers/{layer}.png` | painted layer |
| Framework | `scene.png` + `scene.json` | composited final |

**Humans never hand-author pixel coordinates.** Humans pick tokens
and place them on a tile grid. The framework rasterizes the layout.
AI paints over the rasterization. The framework composites. If the
human wants to override a placement, they edit `scene.assembly.json`,
which is a few lines of JSON — not the stamped image, not the
painted layer, not the final scene.

---

## 3. The tokens library (design-token library)

The tokens library is a per-biome design-token set. Lives at
`assets/tokens/{biome}/`, organised by category subfolder
(`ground/`, `platforms/`, `hazards/`, `decorations/`, `background/`,
`markers/`). Each token is a named, reusable visual element with
three things:

- **body** — its footprint and anchor (how it occupies space)
- **sketch** — a small SVG showing what it looks like (rough)
- **visual attributes** — color, material, layer eligibility, art notes

Building a game = defining a tokens library + assembling scenes from it.

### 3.1 Token definition file (`{token-id}.md`)

```markdown
---
id: pond                          # unique within the biome
biome: grassland
category: hazard                  # ground | hazard | platform | decoration | background | marker
body:
  footprint: { width: 6, height: 2 }    # in concept-tile units
  anchor: bottom-left                    # bottom-left | top-left | center
layers: [play]                    # which layers this token is allowed in
gameplay:
  passable: false
  damage: 1
  beats: [hazard]
visual:
  fill: "#3A6FAA"                 # primary color (skeleton fallback)
  material: "wetland water"
  detail_density: medium          # low | medium | high
  art_notes: |
    A small wetland pond with grass shoreline. Reeds along the left
    and right edges, lily pads centered, calm reflective surface.
sketch:
  file: pond.sketch.svg
  size_px: [288, 96]
---
```

### 3.2 Token sketch (`{token-id}.sketch.svg`)

A small SVG showing the token's form. Authored by humans or LLM.
Suggestive shape, not finished art:

- Right shape (a tree is oval, a pond is wider-than-tall, a mountain
  is triangular)
- Right color family
- Right rough proportions

The sketch is **not** the final art — it's the LEGO token. The painter
stamps it onto the visual map and then image-edit replaces it with
finished painted art while honoring its position and outer shape.

### 3.3 Compilation

```bash
python scripts/tokens_compile.py grassland
```

Walks `assets/tokens/grassland/*.md`, validates frontmatter + sketch
existence, emits `{token-id}.json` next to each MD and a biome
`index.json`. Schema validation:

- Frontmatter has all required keys
- `body.footprint` is positive integers
- `category`, `anchor`, `layers`, `detail_density` are in their enums
- `visual.fill` is `#RRGGBB`
- `sketch.file` resolves to an existing SVG
- `id` is unique within the biome

See `assets/tokens/SCHEMA.md` for the full schema reference.

### 3.4 Layer eligibility

Each token declares which **layers** it can live in:

| layer | typical role | what tokens live here |
|---|---|---|
| `bg-far` | atmosphere, distant | mountains, distant ridges, sky decor |
| `bg-mid` | silhouettes | mid-distance trees, rolling hills, blurred ruins |
| `play` | gameplay | ground, water, platforms, hazards, markers |
| `fg` | foreground frame | vines, branches, blurred grass, columns the camera passes behind |

The same logical token can be eligible for multiple layers — e.g. a
`tree-cluster-mid` is eligible for `bg-mid` *and* `fg` (the same shape
serves both as a mid-distance tree and as a foreground frame, with
different sketches per role typically authored as separate tokens).

---

## 4. Scene authoring (MD-first per-layer grids)

Scenes are authored as **multiple markdown files** per scene:

- `assets/scenes/{scene_id}/visual_mapping.md` — scene-wide manifest
  (frontmatter + prose). Lists per-sub-layer mapping files.
- `assets/scenes/{scene_id}/mappings/{sub-layer}.md` — one file per
  sub-layer. Each contains a YAML frontmatter declaring the sub-layer
  id, its `parallax_layer` (which runtime depth target it contributes
  to), and a 12-row × N-column ASCII grid in a ` ```map ` fenced
  block. Optional `# beats` block for markers and decorations.

A deterministic compiler (`visual_mapping_compile.py`) reads these
files, runs region detection on each grid, looks up each token by its
`visual.symbol` field, and emits `scene.assembly.json` — the
structured artifact the rest of the pipeline (`scene_stamp.py`,
`layer_paint.py`, `scene_layered_assemble.py`) consumes.

The principle: **MD is canonical, JSON is derived.** Humans and AI
both author the markdown; the framework owns the JSON.

### 4.1 Manifest format (`visual_mapping.md`)

```markdown
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
  - mappings/play-collision.md
  - mappings/play-decor.md
  - mappings/fg.md
---

# Visual Mapping: Demo Grassland

Free-form prose describing the scene as a whole — what it teaches,
how it reads left to right, the mood. No token lists, no grids.
```

The manifest declares the scene's parallax layers and lists which
mapping files contribute to them. Multiple sub-layer files can target
the same parallax layer — the `play` parallax is conventionally split
into `play-collision` and `play-decor`.

### 4.2 Sub-layer format (`mappings/{sub-layer}.md`)

```markdown
---
scene_id: demo-grassland
layer: play-collision
parallax_layer: play
grid_size: [120, 12]
---

# play-collision

```map
............................................................................................................
............................................................................................................
... (12 rows × 120 chars total, using tokens' declared symbols)
............................................................................................................
.........................BBBBB.......................WWWWWW............................................BBBBB
gggGGGGGGGGGGwwwGGGGGGGGGGBBBBBgggGG@@@@@@@@@@@@@@@@@@@@WWWWWWGG@@@@@@@@@@@@@@@@@@@@gggGGGGGGGGGG.GGGGGGGGGG
```

# beats

```yaml
- { kind: spawn,         token: spawn,         at: [2, 11] }
- { kind: pickup,        token: pickup-key,    at: [37, 7] }
- { kind: pickup,        token: pickup-potion, at: [53, 6] }
- { kind: exit,          token: exit,          at: [118, 11] }
```
```

The ` ```map ` fenced block is the visual grid — each cell is a single
character symbol declared by a token (e.g. `#` for `ground`, `W` for
`pond`, `=` for `platform-wood`, `T` for `tree-cluster-mid`, `M` for
`mountain-distant`). Multi-cell tokens paint their symbol across the
entire footprint: a 6×2 `pond` shows as a 6×2 region of `W` cells.

The optional ` ```yaml ` block under `# beats` lists markers and
gameplay-event tokens placed at point coordinates (not on the grid).
Markers belong here because they're 1×1 events that conflict with
underlying terrain on the grid. Same for passable hazards and
decorations on certain sub-layer splits.

### 4.3 Static terrain vs dynamic spawn points (`play` sub-layer split)

The `play` parallax layer is conventionally authored as **two**
sub-layer files, split by **how each token lives at runtime** (not
by collision relevance):

- **`play-terrain.md`** (`kind: terrain`) — a single 12×N ASCII grid.
  Holds *every* static token on the play parallax: ground, water,
  platforms, rocks, flowers, bushes, thorn-patches. Decorations
  REPLACE ground at their cells (the grid is the single source of
  truth for what's at each cell — no stacking). Painted into the
  level once at load time; the engine never re-renders.
- **`play-dynamic.md`** (`kind: dynamic`) — YAML-only, **no map
  block**. Lists engine-driven tokens at point spawn coordinates:
  `spawn`, `exit`, pickups, moving platforms, enemies, switches.
  The token's `at` is the *initial* position; runtime motion or
  trigger logic is the engine's job. The painter doesn't render
  these — the engine spawns animated sprites at runtime.

Both files have `parallax_layer: play`; they contribute to the same
runtime depth. The painter consumes only `play-terrain` (paints once);
the engine consumes both (terrain for static collision/visuals,
dynamic for sprite spawn anchors).

The split derives from each token's `kind` field declared in the
tokens (see TOKENS_SPEC.md §9). Tokens with `kind: terrain`
belong on `play-terrain.md`'s grid; tokens with `kind: dynamic`
belong in `play-dynamic.md`'s `# props` YAML block. The compiler
rejects mismatches with clear errors.

Background layers (`bg-far`, `bg-mid`, `fg`) don't need this split —
they're terrain-only by convention. If a scene needs background
depth-within-a-layer (mountains *behind* tree bands on `bg-far`),
add additional `kind: terrain` sub-layer files like
`bg-far-back.md` and `bg-far-front.md`.

### 4.4 Compilation rules

The compiler walks each sub-layer's grid:

1. **Flood-fill maximal contiguous regions** of the same non-`.`
   symbol (4-connected; diagonals don't merge).
2. **Verify the region is rectangular** — every cell in the bbox has
   the same symbol. Non-rectangular regions are rejected.
3. **Look up the token** whose `visual.symbol` matches the region's
   symbol AND whose footprint matches the region's bbox exactly. The
   lookup is scoped to the file's `parallax_layer` (sub-layers share
   their parallax target's symbol space).
4. **Emit a token instance** at the region's anchor (top-left or
   bottom-left depending on the token's `body.anchor`).

If a region doesn't match any token, the compiler fails with a
specific suggestion ("found 7×1 region of `#` — no token has symbol
`#` and footprint 7×1; available `#` tokens: `ground` (5×1)").
Strict matching with helpful errors.

### 4.5 Authoring constraint: same-symbol adjacency

Two same-symbol tokens adjacent on the grid merge into one region.
If no token has the merged footprint, compile fails. Workarounds:

- **Use a wider token variant.** If two `ground-10w` end up adjacent
  (becoming a 20×1 region of `#`), use one `ground-20w` instead.
  The tokens should grow to cover common widths.
- **Break adjacency with a different token.** Insert a `ground-3w`
  with a different symbol between two same-symbol regions.
- **Split into separate sub-layers.** If two same-symbol tokens really
  need to be at adjacent positions visually, put one on `play-decor`
  (different sub-grid).

This is intentional design pressure: it pushes scene authors to use
the right token from the tokens rather than working around the
type system.

### 4.6 What's deliberately NOT in the authoring layer

- **Lighting setup.** Defaults are picked per-style-ref (`hollow-knight`,
  `ori`, `dead-cells`). Per-scene overrides not yet supported.
- **Animation cues.** Out of scope for v1.
- **Camera scripting.** Out of scope.
- **`scene.assembly.json` is NOT hand-authored.** It's the compiler's
  output. Don't edit it directly; edit the markdown files and re-run
  `visual_mapping_compile.py`.

---

## 5. The pipeline

### 5.1 Stages

```
assets/tokens/{biome}/{category}/*.md + *.sketch.svg
       ↓  scripts/tokens_compile.py {biome}
tokens/{biome}/{category}/{token}.json + assets/tokens/{biome}/index.json

assets/scenes/{id}/scene.assembly.json   (human or LLM authored)
       ↓  scripts/scene_stamp.py {id}
assets/scenes/{id}/maps/{layer}.svg + .png   (one per layer in the assembly)

       ↓  scripts/layer_paint.py {id}        (image-edit each map)
assets/scenes/{id}/layers/{layer}.png        (painted finished layers)

       ↓  scripts/scene_layered_assemble.py {id}
assets/scenes/{id}/scene.png + scene.json
```

### 5.2 Stage 1 — compile tokens library

```bash
python scripts/tokens_compile.py grassland
```

Idempotent. Run once per biome, re-run when adding tokens.

### 5.3 Stage 2 — stamp the assembly

```bash
python scripts/scene_stamp.py demo-grassland
```

Reads `scene.assembly.json` + the biome's tokens library. For each layer in
the assembly, composes an SVG by stamping every relevant token's
sketch at its `at` position scaled to the token's footprint. Writes
both the SVG (human-readable, editable) and a rasterized PNG (the
image-edit input).

Output canvas size per layer: `grid_size × concept_tile_px`.

Layers stamp transparent by default — only the tokens in that layer
are drawn; everything else is alpha-zero so the layers behind show
through when composited. The painter (next stage) is responsible for
filling transparent regions appropriately for each layer's role.

Pure deterministic. No LLM, no image-gen.

### 5.4 Stage 3 — paint each layer

```bash
python scripts/layer_paint.py demo-grassland
python scripts/layer_paint.py demo-grassland --only play   # one layer
python scripts/layer_paint.py demo-grassland --dry-run     # write prompts only
```

For each layer in `scene.assembly.json::layers`:

1. Load the stamped map at `maps/{layer}.png` as the **image-edit
   input**.
2. Build a prompt from the role-specific template (atmosphere /
   silhouette / gameplay / foreground-frame). The template enumerates
   every token placed in this layer with its `at` position, footprint,
   and `art_notes` — so the painter knows what to paint at each
   position.
3. Run image-gen with the layer map (#1), the project style anchor
   (#2), the visual target (#3), and any **previously-painted layers**
   (#4+). The previously-painted layers attach in painting order so
   each layer is colored consistently with the layers behind it.
4. Write `layers/{layer}.png` and `layers/{layer}.prompt.txt`.

Layers paint **back-to-front** so cross-layer color/lighting stays
locked. The previous layer's painted output flows into the next
layer's prompt as a reference.

This is the only stage that calls image-gen. Cost ≈ 5 cents per layer
(Gemini 2.5 Flash Image / Nano-banana). A 3-layer scene costs ~15
cents; a 5-layer scene ~25 cents.

### 5.5 Stage 4 — composite

```bash
python scripts/scene_layered_assemble.py demo-grassland
python scripts/scene_layered_assemble.py demo-grassland --resolution gameplay
```

Loads `layers/{layer}.png` for each layer in the assembly,
composites them back-to-front with alpha, writes:

- `scene.png` — the composited preview at concept resolution
- `scene.json` — engine-facing manifest with paths, grid size,
  layer manifest, block instances

For runtime parallax (engine integration), the engine consumes
each `layers/*.png` separately at the layer's declared `depth`
factor. `scene.png` is just the preview.

---

## 6. Per-layer prompt templates

Each layer role has a default prompt template that explains to the
painter what "edit this map" means in context. Templates live in
`scripts/layer_paint.py::ROLE_PROMPTS`. The placeholders `{tokens}`
(named token list with art notes) and `{canvas_w}`/`{canvas_h}` get
filled in per layer.

### 6.1 `bg-far` (atmosphere)
"Paint OVER the schematic with finished atmospheric content (hazy
mountains, soft sky gradients, distant clouds). This is the back-most
layer — fully opaque. Replace transparent regions with painted sky in
the references' style."

### 6.2 `bg-mid` (silhouette)
"Paint mid-distance forms — softer detail than foreground but more
readable than the far background. Trees as tree-shaped masses with
subtle trunk + canopy structure; hills as rolling silhouettes.
Transparent where the input is transparent."

### 6.3 `play` (gameplay)
"Tightest position fidelity (±3% — collision-relevant). Replace ground
rectangles with painted earth (grass blades on top, packed dirt
below). Replace water rectangles with painted ponds (shoreline, lily
pads). Replace platform rectangles with painted ledges (grass-topped
lip, plank structure). Markers should be subtle or omitted — they're
metadata."

### 6.4 `fg` (foreground frame)
"Near-silhouette with slight focus blur. The camera looks past these;
they should feel slightly out of focus. Darker, less saturated than
the play layer."

A scene's `style_ref` (set in the assembly file's
`canvas.style_ref` — TBD; not yet wired in) modulates these
templates with palette / lighting cues drawn from §1.

---

## 7. The same scene in three game styles

Demonstrating that the schema captures genre while letting style swap
freely. Same `scene.assembly.json` (same tokens at same positions),
different style refs and prompt addenda.

### 7.1 Hollow Knight flavor

Style addendum to the per-layer prompts:

```
- Desaturated palette: cold violet sky, near-black silhouettes, deep mossy
  greens.
- Low key-light intensity, high ambient (flat, even illumination).
- Heavy foreground silhouettes; background blurred.
- One or two glow-mushroom point sources at gameplay-significant
  positions.
- No god rays.
```

### 7.2 Ori flavor

```
- Vibrant saturated palette: warm cream sky, vivid teal-green forest,
  glowing accent flowers.
- High key-light intensity, low ambient (strong directional sun).
- 1-2 strong god rays at scene-defining positions.
- Particle motes and pollen drifting through atmosphere layers.
- Soft focus blur on near foreground; sharp midground.
```

### 7.3 Dead Cells flavor

```
- Pixel-art render mode at 4x scale (each "pixel" is 4x4 px in output).
- Limited palette per layer (~6-8 colors).
- Bloom + slight chromatic aberration in post.
- Dynamic player-light (engine-side; does not appear in painted
  layers).
- Fewer layers (3-4 total) — pixel density compensates for less depth.
```

The framework picks one of these based on `assembly.canvas.style_ref`
(currently TBD — implement when needed).

---

## 8. End-to-end worked example: `demo-grassland`

Reference run that exercises every stage.

```bash
# 1. Compile the tokens library
python scripts/tokens_compile.py grassland
# → 7 tokens compiled (ground, pond, platform-wood, tree-cluster-mid,
#   mountain-distant, spawn, exit)

# 2. Stamp the assembly into per-layer visual maps
python scripts/scene_stamp.py demo-grassland
# → maps/bg-far.svg + .png, maps/bg-mid.svg + .png, maps/play.svg + .png

# 3. Paint each layer (or --dry-run to inspect prompts first)
python scripts/layer_paint.py demo-grassland --dry-run
# → layers/{bg-far,bg-mid,play}.prompt.txt

python scripts/layer_paint.py demo-grassland
# → layers/{bg-far,bg-mid,play}.png  (≈15 cents budget)

# 4. Composite into scene.png + scene.json
python scripts/scene_layered_assemble.py demo-grassland
# → scene.png + scene.json
```

Total cost per scene of ~3 layers: ~15 cents. Per scene of ~5 layers:
~25 cents.

Iterating on the assembly (move a token, swap a token) costs nothing
— rerun `scene_stamp.py` + `scene_layered_assemble.py` and the
preview updates from already-painted layers. Re-painting only happens
when the layout actually changed enough to warrant new art.

---

## 9. The collision grid (engine integration)

The painted layers are visuals; the engine needs collision data
separately. Collision is derived from the play-layer token instances:

```python
for inst in scene.assembly.tokens:
    if inst.layer != "play": continue
    token = tokens[inst.token]
    if token.gameplay.passable: continue
    # mark cells from inst.at over token.footprint as collision cells
    # of kind token.category (ground / hazard / platform)
```

Output: a tile grid the engine reads for "is this cell solid, is it a
hazard, can the player jump through it." The grid uses
`canvas.tile_size_px` (the gameplay tile size), distinct from the
concept tile size used for visual rendering.

The collision derivation script is **not yet implemented** — this is
the next piece of work. The block library from
`scripts/blocks_compile.py` (earlier work) has the right shape and
will be merged into this flow.

---

## 10. What this spec deliberately leaves out

- **World/flow composition.** How scenes connect into a game (level
  graph, world map, metroidvania adjacency). Sibling spec for the
  world layer; this one stops at the scene boundary.
- **Character animation.** Existing video-clip-to-frames pipeline
  handles this. Scenes reference characters by id; their animation is
  out of scope.
- **UI/HUD.** Out of scope.
- **Sound.** Out of scope.
- **Procedural variation.** Modern side-scrollers like Dead Cells use
  procgen for level layout. The spec format above is for hand-authored
  scenes; procgen would consume the same vocabulary but have its own
  composition rules. Future work.
- **Camera scripting.** Cinematic moves (pans, zooms, shakes) belong
  in a per-scene `camera.script.md`. Future work.
- **`style_ref` enforcement.** The §7 style flavors are defined in
  prose but not yet driven by an `assembly.canvas.style_ref` field +
  prompt-addendum dispatch. Add when the framework starts targeting
  more than one game style.

---

## 11. Implementation status

| Stage | Status | Path |
|---|---|---|
| Tokens schema | ✅ implemented | `assets/tokens/SCHEMA.md` |
| Tokens compiler | ✅ implemented | `scripts/tokens_compile.py` |
| 7 grassland tokens | ✅ authored | `assets/tokens/grassland/*.md + *.sketch.svg` |
| Scene assembly format | ✅ implemented | `assets/tokens/ASSEMBLY.md` |
| Stamper (assembly → layer maps) | ✅ implemented | `scripts/scene_stamp.py` |
| Layer painter (image-edit) | ✅ implemented (dry-run validated) | `scripts/layer_paint.py` |
| Layer compositor | ✅ implemented | `scripts/scene_layered_assemble.py` |
| Collision grid derivation | ⚠️ pending | (next work) |
| `style_ref` dispatch | ⚠️ pending | (next work) |
| LLM-driven token authoring | ⚠️ pending | (planned playbook task `00-blocks`) |
| LLM-driven scene assembly | ⚠️ pending | (humans hand-author for now) |
| Playbook integration | ⚠️ partial | `scene-blocks/` template exists from earlier work; not yet wired to the tokens flow |

---

## 12. Open questions for v2

1. **Sub-tile placement on non-play layers.** A mountain at `bg-far`
   doesn't snap to gameplay tiles — should the assembly support
   floating-point `at` for non-play layers? Currently all `at` values
   are integer.
2. **Multiple tokens of the same kind in one cell.** If two
   tree-clusters partially overlap on `bg-mid`, the stamper draws
   both (their canopies merge). No deduplication. Probably fine; flag
   if it produces visual noise.
3. **Per-scene lighting overrides.** `style_ref` picks defaults; some
   scenes want to override (a scene at night vs. dawn within the same
   game). Add a `lighting:` block to the assembly when this comes up.
4. **Caching painted layers.** If only one token moves, do all layers
   need re-painting? Probably yes for the layer that changed and any
   layer in front of it (because cross-layer reference flow). A
   per-layer hash-and-skip system is future work.
5. **Foreground (`fg`) layer authoring.** No `fg`-eligible tokens
   exist in the grassland tokens library yet. Adding one or two will
   test whether the same workflow scales to cinematic foreground
   frames or needs adjustments.
