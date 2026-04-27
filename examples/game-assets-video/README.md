# Game Assets Generation — Video Pipeline

A Converge playbook that generates a complete platformer asset pack — characters, shared props, scenes, tilesheets, parallax backgrounds, and a master atlas — driven by a single `idea.md`. Character animations use **video** as the intermediate representation: a short clip is rendered per state (idle, walk, attack, …) from the character's canonical reference, then split into frames any 2D game engine can consume.

This example is a sibling to `examples/game-assets`:
- `game-assets/` — animations come from a single image-gen call drawing all 8 keyframes in a 4×2 grid
- `game-assets-video/` (this) — animations come from img-to-video (Veo / Kling / etc.) and are extracted into individual frames; the rest of the asset pack is **scene-driven**

The playbook is structured around scenes: an art bible anchors visual consistency, shared assets (characters + cross-scene props) get generated once and registered, then each scene in `scenes.json` runs its own per-scene WBS (concept → multi-segment stitched backgrounds → tilesheet → scene-only props → manifest). Backgrounds in particular are wide and horizontally tileable — multiple image-gen calls stitched with feather-blend overlap so platformer parallax actually loops.

## Pipeline

```
idea.md
  ↓
00-visual-target → assets/visual-target.png   (Gemini renders the "finished game" screenshot)
  ↓
01-art-bible    → assets/ART_BIBLE.md + assets/concept/hero-shot.png
  ↓
02-asset-breakdown
  ↓
03-characters (video pipeline)        03-shared-props (image-gen, cross-scene)
  → assets/characters/{id}/...          → assets/objects-shared/{id}/...
  ↓                                      ↓
04-registry-build → assets/REGISTRY.json (auto-derived from on-disk shared assets)
  ↓
05-scenes  (one full WBS per entry in assets/scenes.json)
  ├─ 01-concept     → assets/scenes/{id}/concept.png + SPEC.md
  ├─ 02-background  → assets/scenes/{id}/bg-{far,mid,near}.png   (multi-segment, feather-stitched)
  ├─ 03-tiles       → assets/scenes/{id}/tilesheet/{tilesheet.png + per-tile PNGs}
  ├─ 04-props       → assets/scenes/{id}/props/{prop_id}/spritesheets/{state}/...
  └─ 05-manifest    → assets/scenes/{id}/scene.json + REGISTRY.scenes_using[] update
  ↓
06-export → assets/atlas{,.godot,.unity}.json   (5 categories: characters, objects, tile_maps, backgrounds, scenes)
```

**Character animation** (inside 03-characters): canonical PNG → Veo/Kling/Grok img2vid → ffmpeg extract → loop-frame detection → hybrid matting → frames-mode atlas (`meta.mode = "frames"`, no packed sheet PNG).

**Backgrounds** (inside each scene's 02-background): each layer is generated as N segments of `segment_width` (default 1024px) with `overlap_px` (default 256px) and feather-blended into a wide PNG (default 4096px); `loop_horizontal: true` closes the right→left seam so the layer tiles forever.

Every paid call (image-gen, video-gen) goes through a **budget pre-spend gate** that aborts with a JSON error if the next call would exceed `assets/budget.json`'s `budget_cents`. Failures (429s, network errors) refund automatically. See "Budget" below.

### Techniques ported from [godogen](https://github.com/htdt/godogen)

| Technique | Where | Why it matters |
|---|---|---|
| Auto loop-frame detection | `scripts/lib/loop_frame.py`, `scripts/find_loop_frame.py` | 32×32 RGB embeddings + 7-window similarity + dedup-by-gap → cleanest cycle cut. idle loop seam diff dropped from 23.1 → 4.07 vs fixed 1s window. |
| Hybrid color-matting bg removal | `scripts/lib/matting.py` | Compositing-equation alpha + foreground decontamination + median-corner bg sampling with tolerance band. Replaces the previous chroma-key. Works whether the bg is `#00FF00`, medium-gray, dark-green, etc. Optional rembg+BiRefNet hybrid mode for harder mattes. |
| Budget pre-spend gate | `scripts/lib/budget.py`, `scripts/budget_status.py` | Pre-flight check, log-on-success, `refund_last` on failure. Stops runaway spend; rolls back 429s cleanly. |
| Visual-target-driven planner | `scripts/generate_visual_target.py`, `scripts/generate_assets_md.py`, `scripts/derive_manifests_from_assets_md.py` | Opt-in pre-pipeline stage: render a "what the finished game looks like" screenshot, derive a strict `ASSETS.md` (mandatory pixel-Size column), parse into JSON manifests. See "Planner" below. |

## Quick start

### Full pack via the playbook (recommended)

```bash
cd examples/game-assets-video
echo gemini > .converge/skills/image-generate/backends/ACTIVE
echo grok   > .converge/skills/video-generate/backends/ACTIVE   # or veo / kling
# Put GEMINI_API_KEY (and any video-backend keys) in .env
set -a; source .env; set +a

PYTHONPATH=scripts python scripts/budget_status.py --set 1000   # $10 cap
npx converge run                                                # full playbook
```

That single `npx converge run` produces:

- ART_BIBLE.md + concept hero-shot (style anchor for everything below)
- character spritesheets via the video pipeline (24 frames per state)
- shared/cross-scene prop spritesheets (4×2 grids, 8 frames per state)
- per-scene assets under `assets/scenes/{scene_id}/`: concept image + SPEC, multi-segment stitched backgrounds, scene tilesheet, scene-only props, and a `scene.json` manifest
- `REGISTRY.json` linking shared assets to the scenes that use them
- master atlas (raw + Godot + Unity) aggregating all 5 categories

See `vars.stop_after` in `playbook.yml` to scope the run:
- `characters` — stop after 03-characters (fast iteration on character art)
- `sprites` (default) — runs through 05-scenes; skips master-atlas export
- `export` — adds 06-export
- `full` — same as `export` today, reserved for future hooks

### Reproducing for a new game

1. Edit `idea.md` — one-paragraph game brief.
2. Edit the manifests to declare what to generate:
   - `assets/sprites.json` — characters
   - `assets/objects-shared.json` — cross-scene props/items/hazards (falls back to legacy `objects.json` if missing)
   - `assets/scenes.json` — scenes; each scene declares its own `background.layers`, `tilemap` (id + tile_variants), `scene_props` (scene-only), and references shared `characters` / `shared_props` by ID
3. Set backends + keys (as above), set the budget, run `npx converge run`.

Optional: enable the **visual-target planner** (`00-visual-target` task) to derive the manifests from a reference screenshot Gemini renders from `idea.md`. See that task's body for opt-in instructions.

### Manual flows (advanced)

```bash
# Character (video pipeline, per state):
PYTHONPATH=scripts python scripts/generate_character_angles.py hero-knight
PYTHONPATH=scripts python scripts/generate_video_clip.py    hero-knight idle --duration 8.0
PYTHONPATH=scripts python scripts/extract_video_frames.py   hero-knight idle --preview
PYTHONPATH=scripts python scripts/compose_video_atlas.py    hero-knight idle

# Art bible + scene concept (anchors for downstream calls):
PYTHONPATH=scripts python scripts/generate_art_bible.py
PYTHONPATH=scripts python scripts/generate_concept_hero_shot.py
PYTHONPATH=scripts python scripts/generate_scene_concept.py forest-1

# Per-scene assets (each script reads scenes.json[scene_id] when --scene-id is passed):
PYTHONPATH=scripts python scripts/generate_scene_background.py forest-1 far
PYTHONPATH=scripts python scripts/generate_tile.py forest-1-tilemap grass-base \
    --scene-id forest-1 --scene-concept assets/scenes/forest-1/concept.png \
    --out-root assets/scenes/forest-1/tilesheet
PYTHONPATH=scripts python scripts/build_tilesheet.py forest-1-tilemap \
    --scene-id forest-1 --out-root assets/scenes/forest-1/tilesheet
PYTHONPATH=scripts python scripts/generate_prop_spritesheet.py forest-mushroom-cluster idle \
    --scene-id forest-1 --scene-concept assets/scenes/forest-1/concept.png \
    --out-root assets/scenes/forest-1/props/forest-mushroom-cluster
PYTHONPATH=scripts python scripts/build_scene_manifest.py forest-1

# Shared (cross-scene) prop:
PYTHONPATH=scripts python scripts/generate_prop_spritesheet.py health-potion idle

# Aggregate:
PYTHONPATH=scripts python scripts/build_registry.py
PYTHONPATH=scripts python scripts/build_master_atlas.py
PYTHONPATH=scripts python scripts/budget_status.py             # check spend
```

`--preview` writes `<frame>_qa.png` siblings — the matted frame composited on a contrasting solid bg so the alpha can be visually inspected (transparent areas don't render in many viewers).

### Repair a botched prop run

If `generate_prop_spritesheet.py` produced a 4×2 sheet PNG but the atlas reports 1×1 (Gemini sometimes draws 8 cells with continuous content the grid detector can't separate), rebuild atlases from the existing PNGs without paying for new image-gen:

```bash
PYTHONPATH=scripts python scripts/reatlas_prop_spritesheets.py
PYTHONPATH=scripts python scripts/build_master_atlas.py
```

## Skills

- `image-generate` — same as the image-gen example. Active backend: `gemini` (recommended for this pipeline because the canonical PNG must be on a green background; OpenAI hardcodes `background="transparent"`).
- `video-generate` — img-to-video adapter. Backends shipped:
  - `stub` — 1KB placeholder for free dry runs
  - `veo` (live) — Google Veo via `google-genai`. Requires `GEMINI_API_KEY`. Strongest identity preservation, slowest, only `veo-3.1-generate-preview` at 8s supports `last_frame` bookend.
  - `kling` (live) — Kuaishou Kling img2vid via JWT-signed REST. Requires `KLINGAI_ACCESS_KEY` + `KLINGAI_SECRET_KEY`. Strong identity, queues sometimes hold tasks for >10 min on free tier.
  - `grok` (live) — xAI grok-imagine-video. Requires `XAI_API_KEY` (or `GROK_API_KEY`). Fastest (~15–30s), most flexible duration (1–15s) and aspect ratios, but more identity drift than Veo/Kling.

Switch backends with `echo NAME > .converge/skills/<skill>/backends/ACTIVE`.

### Backend comparison

| | Veo | Kling | Grok |
|--|--|--|--|
| Auth | `GEMINI_API_KEY` | `KLINGAI_ACCESS_KEY` + `KLINGAI_SECRET_KEY` | `XAI_API_KEY` / `GROK_API_KEY` |
| Bookend (`last_frame`) | ✅ on `veo-3.1-preview` at 8s only | partial (kling-v2.1-master only; gate via `KLING_BOOKEND=1`) | ❌ ignored |
| Min duration | 8s (4 on `-fast`) | 5 or 10 (discrete) | 1–15s (most flexible) |
| Wall time per call | ~60–600s | ~60–180s (queues!) | ~15–30s |
| Aspect ratios | 16:9, 9:16 | 16:9, 9:16, 1:1 | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3 |
| Identity preservation | strongest | strong | weakest (creative drift) |
| Cost (per 5s) | ~150¢ | ~50¢ | ~25¢ |
| Prompt cap | none | 2500 chars (compact mode auto-engaged) | none (compact mode used anyway) |

## Frame and atlas details

- 24 frames per state at 24 fps → exactly 1.0s loops.
- Veo's clip duration is fixed at 8s (the only setting where `last_frame` is accepted). The frame extractor runs `lib.loop_frame.find_loop_in_video` to **auto-detect** where the cycle closes, then samples 24 frames from `[0, loop_seconds]`. Disable with `--no-auto-loop` and pass `--window-end <s>` to fall back to a fixed window.
- Each extracted frame is 384×512 RGBA, character centered, transparent background.
- Background removal uses the hybrid color-matting in `lib.matting`: median-corner bg-color sampling with a per-channel tolerance band, compositing-equation alpha, foreground decontamination via `recover_foreground`. Optional rembg+BiRefNet trust/adapt regimes if the dep is installed; pure color-only mode otherwise.
- Atlas schema (frames-mode):

  ```json
  {
    "meta": {
      "mode": "frames",
      "char_id": "hero-knight",
      "state": "idle",
      "frame_count": 24,
      "frame_size": {"w": 384, "h": 512},
      "frames_dir": "assets/characters/hero-knight/videos/idle/frames",
      "frameRate": 24,
      "yoyo": true,
      "source": "video"
    },
    "frames": [
      {"filename": "idle_000.png", "path": "assets/characters/hero-knight/videos/idle/frames/idle_000.png"},
      ...
    ]
  }
  ```

`build_master_atlas.py` reads `meta.mode` and emits per-frame `texture: res://...` references for Godot and per-frame Unity sprites with full-image rects. Sheet-mode atlases (image-gen pipeline) still work alongside.

## Backend gotchas (learned the hard way)

### Veo

- `veo-3.0-generate-001` — 8s only, **rejects** `last_frame`
- `veo-3.0-fast-generate-001` — 4–8s, rejects `last_frame`
- `veo-3.1-generate-preview` — **only** model that accepts `last_frame`, and **only** at 8s duration
- `veo-3.1-fast-generate-preview` — rejects img2vid + `last_frame` combo today
- `person_generation: allow_all` is region-restricted — the backend defaults to `allow_adult` (override via `VEO_PERSON_GENERATION` env var)
- Daily quota is shared across model variants on free tier; one 429 affects all of them

### Kling

- The dev-portal Access Key is a short alphanumeric string (~32 chars). If your env var starts with `sk-` it's not a Kling key, it's an OpenAI / PiAPI / reseller key — wrong product.
- `image_tail` (bookend) is rejected on `kling-v1-6/std/5s`. Set `KLING_BOOKEND=1` only if you've switched to a variant that supports it (e.g. `kling-v2.1-master`).
- Prompts cap at 2500 chars — the backend auto-uses the compact prompt builder.
- Free-tier queues can hold a `submitted` task indefinitely. The default `KLING_MAX_WAIT_S=600` will time out after 10 min; bump it via env if you need longer.

### Grok

- REST API expects `image: {url: "data:..."}` (object), NOT a bare data-URI string. Returns 422 otherwise.
- `last_frame_image` is silently ignored — xAI's API has no bookend support.
- Grok is the most "creative" of the three: it embellishes the reference. Expect identity drift (accessories appearing/disappearing, costume detail shifts) on longer clips. For tight sprite cycles, sample from the first 1–2 seconds where drift is minimal.

### Prompt footgun (all backends)

- **Don't enumerate accessories in the prompt.** Earlier versions of `build_motion_prompt` had a generic line saying "every accessory present in the reference (helmet, cape, sword, shield, belt, armor pieces) stays attached." That hardcoded list told image-to-video models the character had a helmet **even when the canonical reference didn't** — and Grok obediently added one mid-cycle. The fix: point the prompt at the reference image as the only source of truth, and add explicit "DO NOT ADD anything not in the reference" + per-asset prohibitions. Lesson: in vision-grounded prompts, never specify costume details by name when a reference image is also attached. Let the model see the picture; describe only the **rules**, not the **contents**.

## Viewer

```bash
python3 -m http.server 8000
# open http://localhost:8000/inspect/gallery.html
```

`inspect/lib/atlas-loader.js` and `inspect/lib/animations.js` understand both `meta.mode = "sheet"` (the image-gen example's packed atlases) and `meta.mode = "frames"` (this example).

## Configuration

In `playbook.yml` under `vars`:
- `animation_states` — which states to generate (default `[idle, walk]`)
- `engine_targets` — `[godot, unity, raw]`
- `max_characters` / `max_states_per_character` — testing caps
- `stop_after` — `characters` (skip everything after 03-characters), `sprites` (default; runs through 05-scenes, skips master atlas), `export` (adds 06-export), `full`
- `budget_cents` — hard pre-spend cap; every paid call charges before invoking the API

Per-scene background knobs live on each scene entry in `assets/scenes.json`:
- `background.target_width` (default 4096) — width of the final stitched layer
- `background.segment_width` (default 1024) — width of each individual image-gen call
- `background.overlap_px` (default 256) — feather-blend overlap between segments
- `background.loop_horizontal` — close right→left so the layer tiles forever

## Output formats

- `assets/atlas.json` — raw aggregate, grouped by 5 categories (`characters`, `objects`, `tile_maps`, `backgrounds`, `scenes`), `mode` per slice. Per-scene assets land under `categories.scenes` with asset IDs like `forest-1/bg-far`, `forest-1/tilesheet`, `forest-1/prop/torch`.
- `assets/atlas.godot.json` — Godot SpriteFrames-style animations (one per state)
- `assets/atlas.unity.json` — flat Unity sprite list
- `assets/REGISTRY.json` — auto-derived index of shared assets (characters + cross-scene props), each entry carrying the scenes that reference it via `scenes_using[]`
- `assets/scenes/{scene_id}/scene.json` — per-scene manifest produced by `build_scene_manifest.py`, listing the scene's concept/SPEC paths, background layers, tilesheet, scene-only props, and the IDs of registry-resolved characters / shared_props it uses

## Planner (opt-in)

Reverses the conventional ordering: instead of "decide assets → generate them", render a reference screenshot first, then derive the manifests and the art bible from it.

```bash
# 1. Render a "what the finished game looks like" image from idea.md
PYTHONPATH=scripts python scripts/generate_visual_target.py
# → assets/visual-target.png

# 2. Derive the art bible + concept hero-shot (anchors every downstream prompt)
PYTHONPATH=scripts python scripts/generate_art_bible.py
PYTHONPATH=scripts python scripts/generate_concept_hero_shot.py
# → assets/ART_BIBLE.md + assets/concept/hero-shot.png

# 3. Derive ASSETS.md (5-section table with mandatory pixel-Size column)
PYTHONPATH=scripts python scripts/generate_assets_md.py
# → ASSETS.md

# 4. Parse ASSETS.md into the per-category JSON manifests
PYTHONPATH=scripts python scripts/derive_manifests_from_assets_md.py [--force]
# → assets/{sprites,objects-shared,scenes,tile_maps,backgrounds}.json
```

Sizes from the table populate `working_resolution` / `resolution` automatically. Without explicit pixel sizes, downstream scene-builders consistently scale things wrong, so the Size column is enforced by a lint check in the `00-visual-target` task.

`derive_manifests_from_assets_md.py` refuses to overwrite existing manifests unless `--force` is passed.

The 00-visual-target task is enabled by default in the new playbook (it gates 01-art-bible). Steps 2 and 3 also run as their own playbook tasks (`01-art-bible` and `02-asset-breakdown`) — the manual commands above are for one-shot iteration outside the runner.

## Budget

`assets/budget.json` holds a hard pre-spend cap. Every paid generator wraps its API call with `lib.budget.charged(...)` — provisional charge on enter, commit on success, **refund on exception** (notably 429 quota errors that didn't actually consume compute).

```bash
PYTHONPATH=scripts python scripts/budget_status.py            # show state
PYTHONPATH=scripts python scripts/budget_status.py --set 2000 # set budget to $20
PYTHONPATH=scripts python scripts/budget_status.py --reset-log
```

Cost constants live in `scripts/lib/budget.py` — calibrate against your actual provider billing.

If you exceed budget, the next paid script exits with code 2 and a JSON error like:

```json
{"ok": false, "error": "Budget exceeded: need 240¢ for video-veo but only 5¢ remaining (budget=50¢, spent=45¢)."}
```
