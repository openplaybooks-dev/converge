# Task: 03-shared-props/bounce-spring-spritesheet-bounce

# Coil Spring bounce Sprite Sheet

Runs `scripts/generate_prop_spritesheet.py bounce-spring bounce`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so the prop's identity stays consistent across frames.

Outputs land in `assets/objects/bounce-spring/spritesheets/bounce/`:
- `bounce.png` — the 4x4 grid sheet
- `bounce.atlas.json` — Phaser/TexturePacker JSON-Hash atlas (frames + sheet meta)
- `bounce.prompt.txt` — the prompt sent to the model
- `bounce.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (4-pose cycle repeated 4× to fill 16 cells); for `state="idle"` the prop generator prefers the `prop_idle` keyframes if defined, falling back to the generic `idle` cycle.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_prop_spritesheet.py bounce-spring bounce --seed N`.