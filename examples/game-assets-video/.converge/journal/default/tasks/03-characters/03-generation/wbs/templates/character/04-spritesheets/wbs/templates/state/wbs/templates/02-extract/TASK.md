---
id: "{{char_id}}-spritesheet-{{state_name}}-extract"
title: "Extract 24 frames from {{char_name}} {{state_name}} video"
description: "ffmpeg-split the {{state_name}} clip with auto-detected loop point + chroma-key + global-bbox crop."
outputs:
  - "assets/characters/{{char_id}}/videos/{{state_name}}/frames/{{state_name}}_000.png"
  - "assets/characters/{{char_id}}/videos/{{state_name}}/frames/{{state_name}}_023.png"
checks:
  - id: twentyfour-frames-extracted
    cmd: |
      python -c "from pathlib import Path; p=Path('assets/characters/{{char_id}}/videos/{{state_name}}/frames'); n=len(list(p.glob('{{state_name}}_*.png'))); assert n==24, f'expected 24 frames, got {n}'"
    description: Exactly 24 frame PNGs were written
  - id: frames-have-target-size
    cmd: |
      python -c "from PIL import Image; from pathlib import Path; p=Path('assets/characters/{{char_id}}/videos/{{state_name}}/frames/{{state_name}}_000.png'); im=Image.open(p); assert im.size==(384,512), f'unexpected frame size: {im.size}'"
    description: Frame 0 is 384×512 (matches sheet cell size)
  - id: loop-seam-tight
    cmd: |
      python -c "from PIL import Image; import numpy as np; f0=np.array(Image.open('assets/characters/{{char_id}}/videos/{{state_name}}/frames/{{state_name}}_000.png').convert('RGBA')); fN=np.array(Image.open('assets/characters/{{char_id}}/videos/{{state_name}}/frames/{{state_name}}_023.png').convert('RGBA')); diff=np.abs(f0.astype(int)-fN.astype(int)).mean(); assert diff<40.0, f'loop seam too loose: mean diff={diff:.2f}'"
    description: Frame 0 vs frame 23 mean pixel diff < 40 (cycle closes cleanly; idle/walk typically ~5–15, action states up to ~30)
tags:
  - character
  - animation
  - video
  - extract
---

# {{char_name}} {{state_name}} — Extract Frames

Runs `python scripts/extract_video_frames.py {{char_id}} {{state_name}}`.

The script:
1. Probes `videos/{{state_name}}/{{state_name}}.mp4` with ffprobe.
2. Detects letterbox bars with `cropdetect` (Veo pillar-boxes 720×720 inside 1280×720) and crops them off.
3. **Auto-detects the loop end point** with `lib.loop_frame.find_loop_in_video` — embeds every frame as a 32×32 RGB vector, finds the cleanest 7-frame window match against frames 0–6, picks the latest peak within 0.01 of the top similarity. Sets the extraction window end to that frame's timestamp. Disable with `--no-auto-loop`.
4. Pulls 24 frames evenly-spaced across the auto-detected window at 1280×720 native (no per-frame resize yet).
5. Removes the bg using `lib.matting` — physical compositing-equation alpha (`compute_alpha_color`) with bg-color autodetected from the first frame's corners (median + tolerance band). If `rembg` is installed, also blends in a BiRefNet soft mask under one of three auto-selected regimes (`trust`/`adapt`/`color`); otherwise color-only fallback. Decontaminates colored fringes via `recover_foreground`. Pass `--preview` to also write `<frame>_qa.png` composites on a contrasting solid background for visual verification.
6. Computes the **global bbox** of the character across all 24 frames and applies it uniformly so character size stays constant across the cycle.
7. Falls back to 24 transparent placeholder PNGs if the video has no usable duration (stub backend).

Add `--no-chroma-key` if you swap to a backend that already emits alpha. Use `find_loop_frame.py <video.mp4>` directly to inspect what the detector picked without re-extracting.
