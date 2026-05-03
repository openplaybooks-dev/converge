---
title: "Cinematic Video Production — AI film director playbook with character consistency"
description: "End-to-end AI film director playbook. Input idea.md, get a clips/ folder of cinematic shots with on-model characters, locked locations, and audio. Beats AI video drift with a compositing bridge and bookend keyframes."
sidebar:
  label: "Cinematic Video Production"
  order: 1
---

> **Use this if:** *"I want to generate a 15-min to 1-hour narrative video where characters and locations stay on-model from shot to shot."*

**Complexity:** large · **Target runtime:** 15 min – 1 h video · **Category:** [Creative + simulation](../)

AI video generators drift. Face shifts, wardrobe changes, lighting jumps — by shot 12, your protagonist has a different jaw. This playbook is an end-to-end film director that **defeats drift with a compositing bridge**: layout is deterministic (Python + PIL), identity is deterministic (locked reference library), and the model only fills in photoreal rendering.

If you've tried building a long-form video with Sora, Veo, Kling, or Runway and watched continuity collapse — this is the open playbook that solves the consistency problem.

## What it does

```
idea.md
  → story → cast sheets → location plates → style guide
  → scene + shot breakdown
  → storyboard thumbs
  → per-shot compositing bridge (start frame + end frame)
  → shot videos (img2vid using start + end as bookend frames)
  → dialogue TTS → SFX → score
  → clips/{NNN-slug}/{video,dialogue,sfx,music,shot.json}
  → clips.json
```

You write a one-page pitch in `idea.md`. The playbook produces a `clips/` folder with one rendered shot per clip plus a `clips.json` manifest ready to import into a non-linear editor.

## Why it works (the consistency trick)

Four layers prevent drift:

1. **Locked element library** — character sheets (turnaround + expressions + wardrobe), location plates (wide + detail + time-of-day variants), palette, style guide. All generated **once**, never re-drawn.
2. **Compositing bridge** — for each shot, the playbook writes a declarative `composition.json` placing locked elements at normalized positions with z-order and pose hints. Python + PIL flattens it into a blueprint PNG. Then **Nano-banana** (Gemini 2.5 Flash Image) blends blueprint + base plate + element refs into one photoreal keyframe. Layout is deterministic. Identity is deterministic. The model only renders.
3. **Start + end bookending** — step 2 runs **twice per shot**, producing a locked start frame and a locked end frame. The video model interpolates between them instead of hallucinating motion. Backends that support bookend img2vid (Kling 2.5, Runway Gen-4, Sora 2) get dramatically more consistent clips.
4. **Scene state** — per-scene continuity snapshot (who's wearing what, time-of-day, carried props) injected into every composition in that scene so nothing drifts mid-scene.

Regenerations reuse seeds for determinism. A continuity-check task flags drift as backlog items.

## Run modes

Controlled by `vars.stop_after` in `playbook.yml`:

| Mode | Stops after | Use when |
|------|-------------|----------|
| `keyframes` | `07-keyframes` | **Default.** Concept validation — is the look right, do characters stay on-model? Cheap and fast. |
| `full` | `10-assemble` | Production. Adds video rendering, audio (TTS/SFX/score), and `clips.json` manifest. |

To flip to full mode: set `vars.stop_after: full` **and** uncomment the two `# === FULL-MODE ONLY ===` blocks in `playbook.yml`.

## Models — adapter pattern

- **Images** (sheets, plates, keyframes, storyboards): **Nano-banana (Gemini 2.5 Flash Image)** via the `image-generate` skill. Chosen for strong multi-image reference editing.
- **Video** (per-shot rendering): **adapter-only** — the `video-generate` skill ships a stub and a backend README. Drop in Veo 3 / Sora 2 / Kling 2.5 / Runway Gen-4 without touching the playbook. The workflow itself is model-independent.
- **Audio**: `audio-generate` skill with `tts` / `sfx` / `score` sub-contracts. Same adapter pattern.

Stubs let you run the whole pipeline end-to-end (producing placeholder files) before you wire a single paid API call — so you debug the workflow, not the model.

## Anatomy

```
examples/cinematic-video-production/
├── idea.md                                     # your pitch
├── scripts/
│   ├── compose_preview.py                      # PIL blueprint renderer
│   └── compose_blend.py                        # Nano-banana blender
└── .converge/playbooks/default/
    ├── playbook.yml
    ├── schemas/                                # JSON schemas for every artifact
    └── tasks/
        ├── 01-story/                           # idea → screenplay → story bible
        ├── 02-cast/                            # characters + Seed sheet pipeline
        ├── 03-world/                           # locations + Seed plate pipeline
        ├── 04-style/                           # visual + palette + audio style
        ├── 05-breakdown/                       # scenes.json + shots.json + state
        ├── 06-storyboard/                      # Seed: thumb per shot
        ├── 07-keyframes/                       # Seed: locked first/end frame per shot
        ├── 08-shots/                           # Seed: video per shot (prompt/gen/qc/regen)
        ├── 09-audio/                           # dialogue/sfx/score Seed
        └── 10-assemble/                        # shot-meta + clips.json + report
```

## Run it

```bash
git clone https://github.com/myanlabs/converge.git
cd converge/examples/cinematic-video-production

# 1. Write your pitch
$EDITOR idea.md

# 2. Install Python deps for the compositing bridge
pip install -r scripts/requirements.txt

# 3. Set your Gemini key (Nano-banana)
export GEMINI_API_KEY=...

# 4. (Optional) tune duration in playbook.yml → vars.target_duration_minutes

# 5. Run
converge run
```

### Output — keyframes mode (default)

- `compositions/{shot_id}/{start,end}.json` — scene graph per frame
- `compositions/{shot_id}/{start,end}.preview.png` — PIL blueprint (layout only)
- `keyframes/{shot_id}/{start,end}.png` — photoreal Nano-banana blend
- `keyframes/{shot_id}/{start,end}.{prompt.txt,seed.txt}` — exact prompt + seed
- Plus upstream artifacts: `screenplay.fountain`, `story-bible.md`, `characters.json`, `locations.json`, `scenes.json`, `shots.json`, `style-guide.md`, `palette.json`, `storyboard/`

### Output — full mode

Everything above, plus:

- `clips/{NNN}-{slug}/video.mp4` — one per shot
- `clips/{NNN}-{slug}/{dialogue,sfx,music}.wav` — per-shot audio stems
- `clips.json` — ordered manifest with in/out timecode, scene grouping, transition hints
- `REPORT.md` — runtime summary, cost estimate, continuity flags, failed shots

## Customize it

- **Swap the video backend** — implement `skills/video-generate/backends/{kling,sora,runway,veo}.ts` against the adapter contract. The workflow doesn't change.
- **Change the visual style** — edit the `04-style` task to push toward anime, claymation, photoreal docu, etc. The compositing bridge still works — only the final blend prompt changes.
- **Different target duration** — set `vars.target_duration_minutes` in `playbook.yml`. The breakdown task scales the scene/shot count.
- **Tighten continuity** — extend the per-scene state snapshot in `05-breakdown` to include lighting cues, camera lens, or any property you want to lock down.

## Related examples

- [Game Assets](../software/game-assets) — sibling Nano-banana pipeline for sprite generation. Same image model, different workflow shape.
- [Cinematic Video Production source on GitHub](https://github.com/myanlabs/converge/tree/main/examples/cinematic-video-production)
- [Generate something repeatedly](../../guides/generate-something-repeatedly) — guide for thinking about creative pipelines as Converge playbooks.
