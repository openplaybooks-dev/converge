---
id: "{{char_id}}-spritesheet-{{state_name}}-compose"
title: "Write {{char_name}} {{state_name}} frames-mode atlas"
description: "Emit a frames-mode atlas pointing at the 8 extracted frames; no sheet PNG."
outputs:
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json"
  - "assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt"
checks:
  - id: atlas-points-at-frames
    cmd: |
      python -c "import json; from pathlib import Path; a=json.load(open('assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.atlas.json')); m=a['meta']; assert m['mode']=='frames', f\"expected mode=frames, got {m.get('mode')}\"; assert len(a['frames'])==m['frame_count']==8, f\"expected 8 frames, got {len(a['frames'])} (meta {m['frame_count']})\"; missing=[f['path'] for f in a['frames'] if not Path(f['path']).exists()]; assert not missing, f'frame files missing: {missing}'"
    description: Atlas declares mode=frames, lists 8 frame paths, and every path resolves to a real file
  - id: prompt-saved
    cmd: test -s assets/characters/{{char_id}}/spritesheets/{{state_name}}/{{state_name}}.prompt.txt
    description: Sibling .prompt.txt exists for debugging
tags:
  - character
  - animation
  - atlas
  - video
  - compose
---

# {{char_name}} {{state_name}} — Write Frames-Mode Atlas

Runs `python scripts/compose_video_atlas.py {{char_id}} {{state_name}}`.

The script:
1. Reads the 8 PNGs at `assets/characters/{{char_id}}/videos/{{state_name}}/frames/`.
2. Probes the first frame for size metadata.
3. Writes `{{state_name}}.atlas.json` with `meta.mode = "frames"` and per-frame entries `{filename, path}` pointing at the extracted PNGs (no sheet pack, no torso re-alignment).
4. Carries the video prompt + seed into the spritesheet directory so it remains self-contained.

`build_master_atlas.py` reads `meta.mode` to branch — frames-mode atlases emit per-frame texture references instead of pixel rects inside a sheet PNG. The image-gen path (sheet-mode atlas) still works unchanged.
