# cinematic-video-production

End-to-end AI film director. Input an `idea.md`, get a `clips/` folder with consistent cinematic shots and a `clips.json` manifest ready for an NLE.

## What it does

```
idea.md  →  story  →  cast sheets  →  location plates  →  style guide
         →  scene + shot breakdown
         →  storyboard thumbs
         →  per-shot compositing bridge:
               composition.json  →  PIL blueprint preview  →  Nano-banana blend
               (done twice per shot: start frame + end frame)
         →  shot videos (img2vid using start + end as bookend frames)
         →  dialogue TTS  →  SFX  →  score
         →  clips/{NNN-slug}/{video,dialogue,sfx,music,shot.json}
         →  clips.json
```

Target runtime: **15 min – 1 h** narrative video. Pipeline scales with `vars.target_duration_minutes`.

## Why it works (consistency)

AI video generators drift — face, wardrobe, lighting, location change shot-to-shot. This playbook defeats drift with four layers:

1. **Locked element library** — character sheets (turnaround + expressions + wardrobe), location plates (wide + detail + time-of-day variants), palette, style guide. All generated once, never re-drawn.
2. **Compositing bridge** (the key technique) — for each shot, the author writes a declarative `composition.json` placing locked elements at normalized positions with z-order and pose hints. Python + PIL flattens it into a blueprint PNG, then Nano-banana (Gemini 2.5 Flash Image) blends blueprint + base plate + element refs into one photoreal keyframe. Layout is deterministic (Python); identity is deterministic (locked refs). The model only fills in photoreal rendering.
3. **Start + end bookending** — step 2 is done twice per shot, producing a locked start frame and a locked end frame. The video model interpolates between them instead of hallucinating motion. Backends that support bookend img2vid (Kling 2.5, Runway Gen-4, Sora 2) get dramatically more consistent clips.
4. **Scene state** — per-scene continuity snapshot (who's wearing what, time-of-day, carried props) injected into every composition in that scene so nothing drifts mid-scene.

Regenerations reuse seeds for determinism. A continuity-check task flags drift as backlog items.

See `scripts/compose_preview.py` and `scripts/compose_blend.py` for the compositing bridge, and `schemas/composition.schema.json` for the scene-graph format.

## Models

- **Images** (character sheets, location plates, keyframes, storyboards): **Nano-banana (Gemini 2.5 Flash Image)** via the `image-generate` skill. Chosen for strong multi-image reference editing.
- **Video** (per-shot rendering): **adapter-only** — the `video-generate` skill ships a stub and a README in `skills/video-generate/backends/`. Drop in Veo 3 / Sora 2 / Kling 2.5 / Runway Gen-4 without touching the playbook. The workflow itself is model-independent.
- **Audio**: `audio-generate` skill with `tts` / `sfx` / `score` sub-contracts. Same adapter pattern.

Stubs let you run the whole pipeline end-to-end (producing placeholder files) before you wire a single paid API call — so you debug the workflow, not the model.

## Run modes

Controlled by `vars.stop_after` in `playbook.yml`:

| Mode        | Stops after  | Use when                                                  |
| ----------- | ------------ | --------------------------------------------------------- |
| `keyframes` | 07-keyframes | **default.** Concept validation — is the look right, do characters stay on-model? Cheap and fast. |
| `full`      | 10-assemble  | Production. Adds video rendering, audio (TTS/SFX/score), and clips.json manifest. |

To flip to full mode: set `vars.stop_after: full` **and** uncomment the two `# === FULL-MODE ONLY ===` blocks in `playbook.yml`.

## Usage

```bash
# 1. Write your pitch
$EDITOR idea.md

# 2. Install Python deps for the compositing bridge
pip install -r scripts/requirements.txt

# 3. Set your Gemini key (Nano-banana)
export GEMINI_API_KEY=...

# 4. (Optional) tune duration
#    edit .converge/playbooks/default/playbook.yml  →  vars.target_duration_minutes

# 5. Run
converge run
```

### Output — images-only mode (default)

- `compositions/{shot_id}/{start,end}.json` — scene graph per frame
- `compositions/{shot_id}/{start,end}.preview.png` — PIL blueprint (layout only)
- `compositions/{shot_id}/{start,end}.preview.debug.png` — blueprint with element labels
- `keyframes/{shot_id}/{start,end}.png` — photoreal Nano-banana blend
- `keyframes/{shot_id}/{start,end}.prompt.txt` — exact prompt sent
- `keyframes/{shot_id}/{start,end}.seed.txt` — seed for reproducibility
- Plus upstream artifacts: `screenplay.fountain`, `story-bible.md`, `characters.json`, `locations.json`, `scenes.json`, `shots.json`, `style-guide.md`, `palette.json`, `audio-style.md`, `storyboard/`, `characters/`, `locations/`

### Output — full mode

Everything above, plus:

- `clips/{NNN}-{slug}/video.mp4` — one per shot
- `clips/{NNN}-{slug}/{dialogue,sfx,music}.wav` — per-shot audio stems
- `clips/{NNN}-{slug}/shot.json` — reference bundle used
- `clips.json` — ordered manifest with in/out TC, scene grouping, transition hints
- `REPORT.md` — runtime summary, cost estimate, continuity flags, failed shots

## Layout

```
examples/cinematic-video-production/
├── idea.md                                     # user input
├── README.md
├── scripts/
│   ├── build-shot-prompt.js                    # consistency helper
│   └── verify-manifest.js                      # final check
└── .converge/
    ├── project.yml
    └── playbooks/default/
        ├── playbook.yml
        ├── schemas/                            # JSON schemas for every artifact
        └── tasks/
            ├── 01-story/                       # idea → screenplay → story bible
            ├── 02-cast/                        # characters + WBS sheet pipeline
            ├── 03-world/                       # locations + WBS plate pipeline
            ├── 04-style/                       # visual + palette + audio style
            ├── 05-breakdown/                   # scenes.json + shots.json + state
            ├── 06-storyboard/                  # WBS: thumb per shot
            ├── 07-keyframes/                   # WBS: locked first-frame per shot
            ├── 08-shots/                       # WBS: video per shot (prompt/gen/qc/regen)
            ├── 09-audio/                       # dialogue/sfx/score WBS
            └── 10-assemble/                    # shot-meta + clips.json + report
```

Project-level skills live under `../../skills/` — the three adapters (`image-generate`, `video-generate`, `audio-generate`) are referenced by task frontmatter.
