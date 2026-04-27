# Plan: Scene-driven playbook restructure

## Why

The current playbook is flat-by-category: every tile, every prop, every background generated in isolation with one-shot prompts that share only a string-level art-style preset. The result feels like a sample pack, not a coherent game. Common symptoms:

- Forest backgrounds and grassland tiles share no visual DNA — different greens, different lighting, different stroke weight.
- Props look styled in their own bubble; they don't visually belong on the tiles.
- "Forest scene" doesn't exist as a thing in the playbook; it's just emergent from manifest contents.
- Backgrounds are one-shot 1920×1080 PNGs that can't tile horizontally or scroll cleanly.

The user wants a **real-game pipeline**: an art bible at the top, scenes as first-class units, each scene generating its own concept art that anchors every asset belonging to that scene. Plus a smart registry so shared assets (player character, common items) are generated once and reused across scenes.

## Architecture

```
idea.md
  ↓
00-visual-target           → assets/visual-target.png + ASSETS.md
01-art-bible               → assets/ART_BIBLE.md + assets/concept/hero-shot.png
                              (palette, line, lighting, proportions; reference image)
02-asset-breakdown         → .converge/asset-breakdown.json (no change)
03-shared-assets           → SHARED characters, props, items reused across scenes
                              ├─ characters/      (existing video pipeline)
                              ├─ shared-props/    (cross-scene items: keys, potions, …)
                              └─ shared-tiles/    (UI, common decorations)
04-registry-build          → assets/REGISTRY.json
                              (auto-derived index of every shared asset on disk)
05-scenes                  → WBS, fans out per scenes.json entry
                              For EACH scene:
                              ├─ scene/{id}/01-concept     → scenes/{id}/concept.png + SPEC.md
                              ├─ scene/{id}/02-background  → wide stitched parallax bg
                              │                              (multi-call overlap stitching)
                              ├─ scene/{id}/03-tiles       → scene-specific tilesheet
                              ├─ scene/{id}/04-props       → scene-only props/decorations
                              └─ scene/{id}/05-manifest    → scenes/{id}/scene.json
                                                              (refs into REGISTRY + scene-local)
06-export                  → assets/atlas.{json,godot,unity}.json
                              (now scene-aware: per-scene atlas slices grouped together)
```

Two ownership tiers:

- **Shared registry** (03 + 04): characters and any props/tiles authored as cross-scene. Generated once, listed in `REGISTRY.json` with `{id, type, path, atlas_path, scenes_using: []}`.
- **Scene-local** (05): per-scene background, tilesheet, and decorations specific to that scene. Always generated in the context of the scene's concept.png + ART_BIBLE.

Every paid call still runs through `lib.budget.charged()` with refund-on-failure.

## Manifests (input)

```
idea.md                        — one-paragraph game brief
assets/sprites.json            — characters (existing schema, untouched)
assets/objects-shared.json     — shared/cross-scene props (renamed from objects.json)
assets/scenes.json             — NEW: scene list + per-scene asset declarations
assets/backgrounds.json        — DEPRECATED in favor of per-scene background spec
assets/tile_maps.json          — DEPRECATED in favor of per-scene tilesheet spec
```

`scenes.json` is the new center of gravity:

```json
[
  {
    "id": "forest-tutorial",
    "name": "Forest Tutorial",
    "description": "Opening scene. Player learns movement and jump on a sun-dappled forest path with low platforms and basic enemies.",
    "biome": "forest",
    "characters": ["hero-knight"],          // refs into REGISTRY (or sprites.json)
    "shared_props": ["health-potion"],      // refs into REGISTRY (or objects-shared.json)
    "scene_props": [                         // scene-only, generated once for this scene
      {"id": "forest-mushroom-glow", "description": "Cluster of glowing mushrooms with subtle pulse."}
    ],
    "background": {
      "layers": ["far", "mid", "near"],
      "width_px": 6144,                      // wide horizontal scroll target
      "height_px": 1080,
      "tile_seamless": true                  // horizontal wrap-around required
    },
    "tilemap": {
      "id": "forest-floor",
      "tile_size": 32,
      "sheet_grid": [4, 4],
      "tile_variants": [
        {"id": "grass-base", "description": "Top dirt with grass blades"},
        ...
      ]
    }
  },
  {
    "id": "dungeon-1",
    ...
  }
]
```

## Phase-by-phase changes

### Phase 1 — Art bible (NEW: `01-art-bible`)

**Replaces** `01-setup-art-style` (which only validated config + made green templates). The new task:

1. Reads `idea.md` + `assets/visual-target.png` (from `00-visual-target`).
2. Calls Gemini multimodal-text to derive `assets/ART_BIBLE.md` — a structured spec with sections:
   - **Palette**: dominant colors with hex values
   - **Line / shading**: stroke weight, soft vs hard light, painterly vs flat
   - **Character proportions**: head/body ratio, simplified hands/feet
   - **Common shapes**: rounded silhouettes, clean outlines, etc.
   - **Negatives**: things the model must NOT do (no pixel art, no neon, no chromatic aberration)
3. Calls Gemini image-gen for `assets/concept/hero-shot.png` — a single composition that demonstrates the bible (one character on a representative environment, mid-game framing).

The bible's path + the hero-shot's path become reference inputs for **every** downstream prompt builder.

**Files added:**
- `scripts/generate_art_bible.py` — multimodal derivation
- `scripts/generate_concept_hero_shot.py` — image-gen of the demo composition
- `.converge/playbooks/default/tasks/01-art-bible/TASK.md`

**Files reused:**
- `scripts/lib/image_api.py` — backend dispatch
- `scripts/lib/image_api_gemini.py:generate_text_from_image` — already exists
- `scripts/lib/budget.py:charged` — for both calls

### Phase 2 — Asset breakdown (no change to 02 path; add scene awareness)

`scripts/generate_asset_breakdown.py` extended to also count per-scene assets. New `scenes.json` is added to `_load_optional_manifest` alongside the existing manifests. Output `asset-breakdown.json` gains a `per_scene` block:

```json
{
  "summary": { ... existing ... },
  "per_scene": {
    "forest-tutorial": {"characters": 1, "shared_props": 1, "scene_props": 1, "tile_variants": 16, "bg_layers": 3},
    "dungeon-1": {...}
  }
}
```

Same task ID (`02-asset-breakdown`) and outputs.

### Phase 3 — Shared assets (CHANGE: `03-characters` → `03-shared-assets`)

The existing `03-characters` becomes a sub-branch of a new `03-shared-assets` parent that also handles shared (cross-scene) props.

Task tree:

```
03-shared-assets/
├── TASK.md                                    — top-level, no-op or summary
├── characters/                                — IDENTICAL to current 03-characters/
│   └── (full existing video pipeline)
└── shared-props/                              — NEW
    ├── TASK.md
    └── wbs/
        ├── index.js                           — fans out per objects-shared.json entry
        └── templates/prop/...                 — same structure as current 06-props
```

**Why move props here?** Health potions, gold keys, and similar items belong to multiple scenes. The current `06-props` generates them once but doesn't tag them as shared; the new structure makes this explicit and the registry can index them.

**Existing `06-props` is removed.** Anything that was scene-specific moves into per-scene `04-props` under each scene WBS (Phase 5).

### Phase 4 — Registry build (NEW: `04-registry-build`)

After all shared assets land on disk, walk `assets/{characters,objects-shared}/` and emit `assets/REGISTRY.json`:

```json
{
  "characters": [
    {
      "id": "hero-knight",
      "type": "character",
      "ref_canonical": "assets/characters/hero-knight/ref/canonical/canonical.png",
      "states": ["idle", "walk"],
      "atlas_paths": ["assets/characters/hero-knight/spritesheets/idle/idle.atlas.json", ...],
      "scenes_using": []
    }
  ],
  "shared_props": [
    {
      "id": "health-potion",
      "type": "shared_prop",
      "ref_image": "assets/objects-shared/health-potion/spritesheets/idle/idle.png",
      "states": ["idle", "collect"],
      "atlas_paths": [...],
      "scenes_using": []
    }
  ]
}
```

`scenes_using` is filled in during Phase 5 (each scene appends its own ID to the registry entries it references).

**Files added:**
- `scripts/build_registry.py`

**No image-gen.** Pure file-system walk.

### Phase 5 — Scenes (NEW: `05-scenes`, **the big addition**)

WBS dispatcher reads `assets/scenes.json` and spawns one full pipeline per scene:

```
05-scenes/wbs/templates/scene/
├── TASK.md                          — scene root (WBS spawning)
└── wbs/
    ├── index.js                     — sequences the 5 stages
    └── templates/
        ├── 01-concept/TASK.md       — generate concept.png + SPEC.md
        ├── 02-background/TASK.md    — wide multi-call stitched bg
        ├── 03-tiles/TASK.md         — scene tilesheet (per-tile + composite, like current 04-tile-maps)
        ├── 04-props/TASK.md         — scene-only prop spritesheets
        └── 05-manifest/TASK.md      — write scenes/{id}/scene.json
```

Per-scene generation flow:

#### 5.1 — Concept art

Calls Gemini image-gen with **two references**:
1. `assets/visual-target.png` (game-wide style anchor)
2. `assets/concept/hero-shot.png` (bible's demo composition)

Plus a prompt built from the scene's description in `scenes.json` and the ART_BIBLE.md content. Output: `assets/scenes/{scene_id}/concept.png` (one wide game-screenshot-shaped image, e.g. 1920×1080) + `assets/scenes/{scene_id}/concept.prompt.txt`.

The concept image becomes the **anchor reference** for every other asset in this scene.

Also emits `assets/scenes/{scene_id}/SPEC.md` — a derived spec listing exactly which assets this scene needs (concrete: "1 background of forest at dusk, 16 floor tiles incl. grass-base, 3 props specific to this scene"), with sizes and notes.

**New script:** `scripts/generate_scene_concept.py`

#### 5.2 — Wide stitched background

The big new technique. For each parallax layer (far/mid/near):

1. Determine target width (e.g. 6144 for a wide horizontal-scroll level at 1920×1080 viewport).
2. Compute number of segments needed (e.g. 3 × 2048 with 256px overlap → 6144 - 2×256 = 5632 unique width).
3. **Segment 1**: Gemini image-gen with concept.png + ART_BIBLE references. Standard call.
4. **Segments 2..N**: Gemini image-gen-with-edit using the **right edge slice of the previous segment** (256-1024px wide) as a reference + concept.png + ART_BIBLE. Prompt: "extend this composition to the right; preserve the mood, palette, and parallax depth of the reference's right edge". This uses Gemini's image-edit capability (already wired in `lib.image_api_gemini.generate_image_with_edit`).
5. Stitch segments with **alpha-blended overlap**: extract left slice of segment 2 (the part that's continuing segment 1's right edge), feather-blend with segment 1's right slice, paste into final canvas.
6. Optional: if `tile_seamless: true`, run a final pass — generate a small "loop closure" segment from the right edge of segment N and the left edge of segment 1 to make the whole thing horizontally tile.

For 3-layer × 3-segment scene: 9 image-gen calls per layer × 3 layers = ~27 calls per scene background. At Gemini's ~5¢/call this is ~$1.35 per scene background (vs ~$0.15 in the current pipeline). Worth it for visual cohesion.

**New scripts:**
- `scripts/generate_scene_background.py` — orchestrates per-layer, per-segment generation
- `scripts/lib/stitch.py` — feather-blend + horizontal-loop-close helper

#### 5.3 — Scene tiles

Same per-tile + composite pattern as existing `04-tile-maps`, but **with concept.png as a reference** on every per-tile call. Reuses `scripts/generate_tile.py` and `scripts/build_tilesheet.py`; modifies `generate_tile.py` to accept an extra `--scene-concept PATH` flag that's added to the reference list.

#### 5.4 — Scene props

Same per-state spritesheet pattern as existing `06-props`, but with concept.png as a reference. Reuses `scripts/generate_prop_spritesheet.py` with the same `--scene-concept PATH` flag.

The shared-prop generators (Phase 3) don't take this flag because they're scene-agnostic.

#### 5.5 — Scene manifest

Walks `assets/scenes/{scene_id}/` and emits `scenes/{scene_id}/scene.json`:

```json
{
  "id": "forest-tutorial",
  "concept": "assets/scenes/forest-tutorial/concept.png",
  "spec": "assets/scenes/forest-tutorial/SPEC.md",
  "background": {
    "layers": [
      {"layer": "far", "path": "assets/scenes/forest-tutorial/bg-far.png", "width": 6144, "height": 1080},
      ...
    ]
  },
  "tilemap": "assets/scenes/forest-tutorial/tilesheet/tilesheet.atlas.json",
  "characters": [
    {"id": "hero-knight", "atlas": "assets/characters/hero-knight/spritesheets/idle/idle.atlas.json"}
  ],
  "shared_props": [{"id": "health-potion", "atlas": "..."}],
  "scene_props": [{"id": "forest-mushroom-glow", "atlas": "..."}]
}
```

Also appends `forest-tutorial` to each referenced REGISTRY entry's `scenes_using[]`.

**New script:** `scripts/build_scene_manifest.py`

### Phase 6 — Master atlas export (rename: `06-export`)

The existing `07-export` task moves to `06-export`. `build_master_atlas.py` is taught a new top-level structure:

```json
{
  "categories": {
    "characters": [...],          // unchanged
    "shared_props": [...],         // renamed from "objects"
    "scenes": {
      "forest-tutorial": {
        "background_layers": [...],
        "tilemap": {...},
        "scene_props": [...]
      },
      "dungeon-1": {...}
    }
  }
}
```

Godot/Unity exports unchanged in shape; new scenes section adds animation namespaces like `scenes/forest-tutorial/scene-prop/forest-mushroom-glow/idle`.

## Files: complete change list

### New files
- `scripts/generate_art_bible.py`
- `scripts/generate_concept_hero_shot.py`
- `scripts/build_registry.py`
- `scripts/generate_scene_concept.py`
- `scripts/generate_scene_background.py`
- `scripts/lib/stitch.py`
- `scripts/build_scene_manifest.py`
- `.converge/playbooks/default/tasks/01-art-bible/TASK.md`
- `.converge/playbooks/default/tasks/03-shared-assets/TASK.md`
- `.converge/playbooks/default/tasks/03-shared-assets/shared-props/TASK.md`
- `.converge/playbooks/default/tasks/03-shared-assets/shared-props/wbs/index.js`
- `.converge/playbooks/default/tasks/04-registry-build/TASK.md`
- `.converge/playbooks/default/tasks/05-scenes/TASK.md`
- `.converge/playbooks/default/tasks/05-scenes/wbs/index.js`
- `.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/TASK.md`
- `.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/index.js`
- 5× `01-concept/02-background/03-tiles/04-props/05-manifest` per-scene-stage TASK.md files

### Modified files
- `.converge/playbooks/default/playbook.yml` — new task list (00 → 01-art-bible → 02 → 03 → 04 → 05 → 06), updated description, deprecated vars
- `assets/scenes.json` — NEW manifest, user-authored (or derived from idea.md)
- `assets/objects-shared.json` — RENAMED from `assets/objects.json` (only cross-scene props)
- `scripts/generate_tile.py` — accept `--scene-concept PATH` flag
- `scripts/generate_prop_spritesheet.py` — accept `--scene-concept PATH` flag
- `scripts/build_master_atlas.py` — emit scenes-aware structure
- `scripts/generate_asset_breakdown.py` — count per-scene
- `scripts/generate_assets_md.py` — derive scenes.json + objects-shared.json from visual-target

### Deprecated / removed files
- `.converge/playbooks/default/tasks/01-setup-art-style/` — replaced by 01-art-bible
- `.converge/playbooks/default/tasks/04-tile-maps/` — moves to per-scene 03-tiles
- `.converge/playbooks/default/tasks/05-backgrounds/` — moves to per-scene 02-background
- `.converge/playbooks/default/tasks/06-props/` — split: shared moves to 03-shared-assets, scene-only moves to per-scene 04-props
- `.converge/playbooks/default/tasks/07-export/` — renamed to 06-export
- `assets/backgrounds.json` — replaced by per-scene `background:` field in scenes.json
- `assets/tile_maps.json` — replaced by per-scene `tilemap:` field in scenes.json

## Critical files to read

For each new generator I'll mirror existing patterns:

- `scripts/generate_character_angles.py` — reference for budget-gated single-image-gen pattern
- `scripts/generate_prop_spritesheet.py` — reference for retry-on-grid-detect-fail pattern
- `scripts/generate_background_layer.py` — reference for full-resolution single-image-gen
- `scripts/lib/image_api_gemini.py:generate_image_with_edit` — image-edit (used heavily by stitching)
- `scripts/lib/image_api_gemini.py:generate_text_from_image` — multimodal-to-text (for ART_BIBLE generation)
- `scripts/lib/budget.charged` — context manager for cost gating with refund-on-failure
- existing `04-tile-maps/wbs/index.js` — reference for fan-out-per-manifest WBS pattern
- existing `06-props/wbs/index.js` — reference for nested per-asset-per-state spawning

## Cost estimate (one full run, one mid-sized game)

For a game with 1 hero, 5 shared props, and 3 scenes (each: ~16 tiles, 3-segment × 3-layer wide bg, 3 scene-only props):

| Phase | Calls | Cost |
|-------|------:|-----:|
| 00 visual-target | 1 image | 5¢ |
| 01 art bible | 1 text + 1 image | 10¢ |
| 03 shared characters | 1 video (8s Veo) + 1 canonical image | ~85¢ |
| 03 shared props | 5 props × 2 states × ~2 attempts | 100¢ |
| 04 registry-build | free | 0 |
| 05 per scene × 3:
| - 5.1 concept | 1 image | 5¢ × 3 = 15¢ |
| - 5.2 wide bg | 3 layers × 3 segments | ~135¢ × 3 = 405¢ |
| - 5.3 tiles | 16 tiles × 1 call | ~80¢ × 3 = 240¢ |
| - 5.4 scene props | 3 props × 2 states × ~2 | ~60¢ × 3 = 180¢ |
| - 5.5 manifest | free | 0 |
| 06 export | free | 0 |
| **Total** |  | **~$10.40** |

Compare to current flat playbook (~$2 for the same scope). The 5× cost is mostly the wide stitched backgrounds — they're the user's primary correctness ask. Default `vars.budget_cents` should be raised to 1500¢ ($15) to leave headroom.

## Migration: keeping the existing pipeline working

The user has working hero-knight idle + walk + a forest tilemap + 11 props on disk right now. We don't want to throw those out.

**Plan:**

1. The new flat-by-category task graph stays alive under a new `vars.use_scene_pipeline: false` default. Setting it to `true` activates the new scene-driven graph; leaving it `false` keeps existing behavior.
2. After verifying the scene pipeline works end-to-end with the stub video backend (free), flip the default to `true` for new projects but document the legacy `false` path for existing ones.
3. Existing `assets/objects.json` and `assets/backgrounds.json` are loaded as **fallback** input when the corresponding new manifest is absent. This means the current frames don't need to be regenerated.

## Verification

End-to-end smoke test (free, with stub backends):

```bash
cd examples/game-assets-video
echo stub > .converge/skills/image-generate/backends/ACTIVE
echo stub > .converge/skills/video-generate/backends/ACTIVE

# minimal scenes.json with one tiny scene
cat > assets/scenes.json <<'EOF'
[{
  "id": "test-scene",
  "name": "Test",
  "description": "Smoke test scene",
  "biome": "forest",
  "characters": [],
  "shared_props": [],
  "scene_props": [],
  "background": {"layers": ["far"], "width_px": 1024, "height_px": 512},
  "tilemap": {"id": "test", "tile_size": 32, "sheet_grid": [2, 2], "tile_variants": [{"id": "t0"},{"id":"t1"},{"id":"t2"},{"id":"t3"}]}
}]
EOF

PYTHONPATH=scripts python scripts/budget_status.py --set 2000
npx converge run --vars use_scene_pipeline=true,stop_after=full
```

Expected files (any order):
- `assets/visual-target.png` (placeholder from stub)
- `assets/ART_BIBLE.md` (text from gemini text-out, even on stub for image we get a placeholder image)
- `assets/concept/hero-shot.png` (placeholder)
- `assets/REGISTRY.json` (empty arrays since no shared assets)
- `assets/scenes/test-scene/concept.png`
- `assets/scenes/test-scene/SPEC.md`
- `assets/scenes/test-scene/bg-far.png` (1024-wide, even from stub — script writes a 1KB header, downstream scripts handle 0-duration gracefully)
- `assets/scenes/test-scene/tilesheet/tilesheet.png`
- `assets/scenes/test-scene/scene.json`
- `assets/atlas.json` with `scenes.test-scene.{...}`

Note: stub backend doesn't produce real images. The smoke test only verifies the **task graph fans out, dependencies fire, and outputs paths land where expected**. A real-image smoke test needs gemini active and ~$0.50 of budget for a tiny scene.

Real-image smoke test (one tiny scene, gemini, ~$1):

```bash
echo gemini > .converge/skills/image-generate/backends/ACTIVE
echo grok > .converge/skills/video-generate/backends/ACTIVE
set -a; source .env; set +a
npx converge run --vars use_scene_pipeline=true,stop_after=full
# inspect assets/scenes/test-scene/concept.png — should look like the visual target
# inspect assets/scenes/test-scene/bg-far.png — wide, seamless-ish
# inspect inspect/play.html with scene loaded
```

## Open items (resolve while implementing)

- **`when:` clauses in Converge YAML**: I don't know if the framework supports conditional task gating via `when: ${vars.use_scene_pipeline}`. If not, the scene-pipeline gate lives in each WBS dispatcher's first lines (similar to existing `stop_after` gating).
- **Wide-bg stitching seam quality**: alpha-blended overlap may produce visible seams if Gemini's right-edge interpretation of segment N doesn't match its left-edge of segment N+1. Mitigation: use 512px overlap (33% of 1536) and pre-blur the blend mask. If still bad, fall back to a feathered linear gradient.
- **Concept-image shape**: docs above say 1920×1080 for concept.png. Should we instead make it the same aspect as the scene's intended viewport? Let user decide via scenes.json.
- **Multi-scene parallel generation**: scenes are independent and could run in parallel. WBS spawns them as parallel subtasks; the runner schedules them concurrently. May hit Gemini rate limits — keep the existing budget gate to absorb 429s.
- **Backwards compat for the master atlas**: existing consumers (gallery.html, play.html) read `categories.{characters,objects,tile_maps,backgrounds}`. If we restructure to add `scenes`, the viewer JS needs a small update to handle both shapes.

## What this plan deliberately does NOT do

- **No new video backend** (Veo/Kling/Grok stay as-is). Wide-bg stitching is image-gen only.
- **No 3D path** (Tripo3D etc. — would be a separate plan).
- **No re-running of existing assets** — current hero-knight + props + bg + tiles stay on disk and work under the legacy flat path. Activating the new scene pipeline regenerates with proper scene context.
- **No animated backgrounds** — backgrounds remain static parallax layers. Animated bg elements (waving trees, drifting clouds) would be a separate scene-prop type.
- **No automatic `scenes.json` derivation in this plan** — that's an extension to the visual-target planner that can be added once the manual flow proves out.
