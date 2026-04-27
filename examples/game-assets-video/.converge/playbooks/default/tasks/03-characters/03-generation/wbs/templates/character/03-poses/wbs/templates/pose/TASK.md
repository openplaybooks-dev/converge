---
id: "{{char_id}}-pose-{{pose_name}}"
title: "Generate {{char_name}} {{pose_name}} pose"
description: "{{pose_description}}"
wbs:
  type: shell
  path: scripts/generate_secondary_refs.py
  args:
    - "{{char_id}}"
    - "{{pose_name}}"
    - "{{pose_description}}"
outputs:
  - "assets/characters/{{char_id}}/variants/{{pose_name}}/{{pose_name}}.png"
checks:
  - id: pose-png-is-real
    cmd: |
      python -c "from PIL import Image; im=Image.open('assets/characters/{{char_id}}/variants/{{pose_name}}/{{pose_name}}.png'); assert min(im.size)>=64, f'too small: {im.size}'"
    description: Pose PNG is at least 64x64 (rejects placeholder stubs)
  - id: pose-prompt-saved
    cmd: test -s assets/characters/{{char_id}}/variants/{{pose_name}}/{{pose_name}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - character
  - pose
---

# {{char_name}} {{pose_name}} Variant

Runs `scripts/generate_secondary_refs.py {{char_id}} {{pose_name}} "{{pose_description}}"`. Edits the canonical reference (`assets/characters/{{char_id}}/ref/canonical/canonical.png`) to show the {{pose_name}} pose while keeping viewport, framing, scale, and identity locked.

Outputs land in `assets/characters/{{char_id}}/variants/{{pose_name}}/`:
- `{{pose_name}}.png` — the variant
- `{{pose_name}}.prompt.txt` — the prompt sent to Gemini
- `{{pose_name}}.seed.txt` — the seed used

Depends on the canonical reference task completing first. To debug, `cat` the prompt or re-run with a different seed: `python scripts/generate_secondary_refs.py {{char_id}} {{pose_name}} "{{pose_description}}" --seed N`.
