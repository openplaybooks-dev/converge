---
id: "{{char_id}}-spritesheet-{{state_name}}-video"
title: "Generate {{char_name}} {{state_name}} animation video"
description: "Call video-generate on the canonical reference for the {{state_name}} cycle."
skills:
  - video-generate
outputs:
  - "assets/characters/{{char_id}}/videos/{{state_name}}/{{state_name}}.mp4"
  - "assets/characters/{{char_id}}/videos/{{state_name}}/{{state_name}}.prompt.txt"
  - "assets/characters/{{char_id}}/videos/{{state_name}}/{{state_name}}.seed.txt"
checks:
  - id: video-mp4-exists
    cmd: test -s assets/characters/{{char_id}}/videos/{{state_name}}/{{state_name}}.mp4
    description: Video clip was written and is non-empty
  - id: video-prompt-saved
    cmd: test -s assets/characters/{{char_id}}/videos/{{state_name}}/{{state_name}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - character
  - animation
  - video
---

# {{char_name}} {{state_name}} — Generate Video

Runs `python scripts/generate_video_clip.py {{char_id}} {{state_name}}`.

The script:
1. Loads the canonical character reference at `assets/characters/{{char_id}}/ref/canonical/canonical.png`.
2. Translates the 8 keyframes from `scripts/lib/keyframes.py` into a continuous motion narration (with palette + identity locks + a "pure #00FF00 background" instruction so we can chroma-key it later).
3. Reads `.converge/skills/video-generate/backends/ACTIVE` and invokes that backend's `generate.js` with `{first_frame_image, prompt, duration_s, aspect_ratio, seed}`.
4. Writes the resulting `.mp4` plus prompt + seed siblings.

To swap models, change `.converge/skills/video-generate/backends/ACTIVE` (e.g. `kling`). The default `stub` backend writes a 1KB placeholder so the rest of the pipeline can run end-to-end without API spend.
