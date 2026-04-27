# game-assets-3d-meshy

**Character production line + scene viewer** — clones the per-character workflow from `examples/game-assets` (2D pixel sprites) but emits PBR-textured **3D GLB characters + props**, with auto-rig + animations, on a procedural tilemap arena, viewable as a single coherent scene.

```
idea.md
  characters
    → 1 reference image per character        (nanobanana, conditioned on class anchor)
    → textured GLB                           (Meshy image-to-3D, preview → refine)
    → rigged GLB                             (Meshy auto-rig)
    → per-clip animation GLBs                (Meshy animation library)
  props
    → 1 reference image per prop             (nanobanana, no class anchor)
    → textured GLB                           (Meshy image-to-3D, preview → refine — no rig)
  environment
    → procedural tilemap + skybox + lighting (no API call — derived from palette)
  scene
    → deterministic placement → scene.json   (Halton-sequence prop scatter, character row)
  output
    → viewer/gallery.html                    (per-asset OrbitControls cards)
    → viewer/scene.html                      (THE FULL SCENE — characters on the tilemap with props, animated)
```

## Sibling examples

| Example | Output | Use when |
|---|---|---|
| `examples/game-assets` | 2D pixel sprites + spritesheets | retro 2D games |
| `examples/game-assets-3d` | procedural three.js code-meshes | quick concept demo, no API |
| **`examples/game-assets-3d-meshy`** *(this one)* | **PBR GLB + rig + animations** | **shippable 3D character roster** |
| `examples/playable-mvp-3d` | full game MVP — environment + physics + gameplay | playable demo |

## Quick start (offline, no API key)

```bash
cd examples/game-assets-3d-meshy
converge run                       # uses stub backends — runs offline in seconds
open viewer/scene.html             # ← THE FULL SCENE — tilemap + characters + props, animated
open viewer/gallery.html           # per-asset cards for review
```

The default backends are stubs that copy a vendored 872-byte `vendor/stub-cube.glb` into every model slot and return a 1×1 PNG for every reference. The full pipeline runs end-to-end with no Meshy or Gemini account; every check passes; the gallery loads. The "characters" all look like cubes — that's expected and proves the pipeline wiring.

## Running with real APIs

### 1. Put your keys in `.env`

Copy the example file and fill in real keys:

```bash
cp .env.example .env
# then edit .env to add:
#   GEMINI_API_KEY=...
#   MESHY_API_KEY=msy_...
```

`.env` is gitignored. Every script that calls a real backend imports `scripts/_load_env.js` at the top, which loads this file into `process.env` automatically. **Shell-exported vars take precedence** — if you `export MESHY_API_KEY=other...` in your shell, that overrides `.env` for that run.

### 2. Flip the adapters

```bash
echo gemini > .converge/skills/image-generate/backends/ACTIVE
echo meshy  > .converge/skills/meshy-generate/backends/ACTIVE
echo meshy  > .converge/skills/meshy-rig/backends/ACTIVE
echo meshy  > .converge/skills/meshy-animate/backends/ACTIVE

converge run
```

To debug what `_load_env.js` picked up: `CONVERGE_ENV_DEBUG=1 converge run` will print which vars were loaded from `.env` (to stderr).

### Gemini (nanobanana) setup

The gemini backend in `image-generate/backends/gemini/generate.js` shells out to `scripts/lib/image_api.py` (the same Python wrapper used by `examples/game-assets`). To use it here, copy that lib into this example:

```bash
mkdir -p scripts/lib
cp ../game-assets/scripts/lib/image_api.py scripts/lib/
```

We don't ship it copied by default to avoid drift — if `examples/game-assets` updates the lib, this example reads it directly.

### Meshy live-mode caveat (image-to-3D)

Meshy's image-to-3D endpoint requires a **publicly-reachable URL** for the reference image. `scripts/meshy_step.js` currently passes `file://<absolute path>`, which works for the stub but fails on the real Meshy backend. To use real Meshy, you have two options:

1. **Host the PNG**: upload `assets/characters/<id>/reference.png` to any HTTPS host (S3, Cloudflare R2, even a temp imgbb) before running task 04, then patch `meshy_step.js` to use that URL.
2. **Add an upload helper**: extend `.converge/skills/meshy-generate/backends/meshy/generate.js` with an upload step that POSTs the local file to Meshy's CDN endpoint and uses the returned URL. This is a small (~40 LOC) addition.

Both approaches are documented in the Meshy API docs. Stub mode skips all of this.

## Cost

Default scope: 5 characters across 3 classes (warrior/mage/ranger), 3 animation clips per humanoid:

| Phase | Calls | Stub | Real |
|---|---|---|---|
| Class style guides (3 classes × 1 image) | 3 | 0 | ~3 Gemini calls |
| Character references (5 × 1 image) | 5 | 0 | ~5 Gemini calls |
| Meshy preview (5 × 5cr) | 5 | 0 | 25 cr |
| Meshy refine (5 × 10cr) | 5 | 0 | 50 cr |
| Meshy rig (5 humanoids) | 5 | 0 | bundled |
| Meshy animations (5 × 3 clips × 3cr) | 15 | 0 | 45 cr |
| **Total** | 38 | **$0** | **~120 Meshy cr (~$2.40)** + ~8 Gemini calls |

Meshy Pro = $20/mo for 1000 credits → ~8 full runs/month.

## Style consistency mechanism

The big idea — **class style guides** — comes from `examples/game-assets`:

1. Task 02 generates one anchor image per unique class (warrior / mage / ranger) using a prompt that describes the class and lists every character in it.
2. Task 03 generates each character's reference image using the **class anchor as a Gemini reference image**. The character description goes in the prompt; the class anchor stays constant.

Result: every warrior shares silhouette/material/palette family; every mage shares a different one; the cast reads as one stylistically coherent roster. This cohesion mechanism is the most valuable part of `game-assets`'s machinery — we keep it verbatim, just drop the 2D-sprite-specific cruft (chroma-key, multi-angle refs, sprite atlases).

## What's intentionally dropped vs `examples/game-assets`

- **Green-screen template + chroma-key alpha despill** — Meshy image-to-3D handles backgrounds natively; full neutral-gray studio background works fine.
- **Multi-angle reference generation** (`canonical_angle`, source@512 + canonical@128 pyramid) — one image is enough for image-to-3D.
- **Animation-frame spritesheets + atlas.json** — Meshy emits skeletal animation, not frame strips.
- **Locked viewport contract for sprite alignment** — irrelevant in 3D.

## Customizing

- **Edit `idea.md`** to change the cast, classes, or art direction. Re-run `converge run`.
- **Add a character**: add a `- **id**: description` bullet under one of the H3 class headings (`### Warrior`, `### Mage`, `### Ranger`) in `idea.md`.
- **Add a class**: add a new H3 (e.g. `### Cleric`) and update `ANIMS_BY_CLASS` in `scripts/build_design.js` to declare its default animation set.
- **Change Meshy parameters per asset** (polycount, model_type): edit `scripts/meshy_step.js`'s `preview` branch.
- **Extend the action library**: edit `ACTION_IDS` in `scripts/meshy_step.js` (the map from clip name to Meshy library `action_id`).

## Layout

```
examples/game-assets-3d-meshy/
├── README.md                                  you are here
├── idea.md                                    INPUT — edit this
├── scripts/
│   ├── build_design.js                        01-design
│   ├── build_class_guide.js                   02 fan-out
│   ├── build_character_ref.js                 03 fan-out
│   ├── meshy_step.js                          04/05/06/07 dispatcher
│   ├── build_gallery.js                       08
│   └── _make_stub_glb.js                      one-time helper
├── vendor/
│   └── stub-cube.glb                          ~870-byte placeholder for offline
├── .converge/
│   ├── project.yml
│   ├── playbooks/default/
│   │   ├── playbook.yml                       8-task DAG
│   │   └── tasks/01-08/                       TASK.md + WBS dispatchers
│   └── skills/
│       ├── image-generate/                    nanobanana adapter (copied from game-assets)
│       │   └── backends/{ACTIVE, gemini/, stub/}
│       ├── meshy-generate/                    image-to-3D + text-to-3D (copied from playable-mvp-3d)
│       ├── meshy-rig/
│       └── meshy-animate/
├── assets/                                    OUTPUT
│   ├── pitch.md  characters.json
│   ├── shared/classes/<class>/{reference.png, style-guide.md}
│   └── characters/<id>/
│       ├── SPEC.md  reference.png  meshy.json
│       ├── preview.glb  model.glb  rigged.glb
│       └── anims/{Idle, Walk, Attack|CastSpell|BowDraw}.glb
└── viewer/gallery.html                        ← open this
```

## Limitations

- **Image-to-3D fidelity** is bounded by Meshy. Complex characters (long capes, intricate weapons) sometimes need a refined reference image first.
- **Meshy auto-rig is humanoid-only**, with hard constraints (≤300k faces, +Z front-facing). Non-humanoid creatures need different tooling.
- **No audio, no environment, no gameplay** — this is an asset-production example. Pair it with `examples/playable-mvp-3d` for level + physics + gameplay.
- **Live mode requires the meshy backend to upload PNGs** — see "Meshy live-mode caveat" above.
