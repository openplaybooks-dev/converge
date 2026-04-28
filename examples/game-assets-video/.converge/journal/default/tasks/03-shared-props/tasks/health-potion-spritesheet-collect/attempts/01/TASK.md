# Task: 03-shared-props/health-potion-spritesheet-collect

# Health Potion collect Sprite Sheet

Runs `scripts/generate_prop_spritesheet.py health-potion collect`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so the prop's identity stays consistent across frames.

Outputs land in `assets/objects/health-potion/spritesheets/collect/`:
- `collect.png` — the 4x4 grid sheet
- `collect.atlas.json` — Phaser/TexturePacker JSON-Hash atlas (frames + sheet meta)
- `collect.prompt.txt` — the prompt sent to the model
- `collect.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (4-pose cycle repeated 4× to fill 16 cells); for `state="idle"` the prop generator prefers the `prop_idle` keyframes if defined, falling back to the generic `idle` cycle.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_prop_spritesheet.py health-potion collect --seed N`.