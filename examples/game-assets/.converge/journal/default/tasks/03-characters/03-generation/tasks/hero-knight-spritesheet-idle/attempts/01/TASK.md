# Task: 03-characters/03-generation/hero-knight-spritesheet-idle

# Sir Aldric idle Sprite Sheet

Runs `scripts/generate_spritesheet.py hero-knight idle`. **One image-gen call** draws a 4x4 grid (16 frames) on one canvas, so character identity stays consistent across frames.

Outputs land in `assets/characters/hero-knight/spritesheets/idle/`:
- `idle.png` — the 4x4 grid sheet (4·working_resolution × 4·working_resolution)
- `idle.prompt.txt` — the prompt sent to the model (with all 16 keyframes inline)
- `idle.seed.txt` — the seed used

Frame ordering is left-to-right, top-to-bottom (frame 1 = top-left, frame 16 = bottom-right). Keyframe poses come from `scripts/lib/keyframes.py` (the script repeats the 4-pose cycle 4× to fill 16 cells). Working resolution comes from `assets/sprites.json`. Depends on the canonical reference task (`hero-knight-02-ref`) completing first.

To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_spritesheet.py hero-knight idle --seed N`.