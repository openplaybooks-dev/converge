---
id: "{{nnn}}-01-prompt"
title: "Prompt — {{shotId}}"
description: Build the deterministic video prompt for shot {{shotId}}.
tags:
  - shot
  - prompt
inputs:
  - shots.json
  - "scenes/{{sceneId}}/state.json"
  - style-guide.md
  - palette.json
  - characters/**/ref.json
  - locations/**/ref.json
outputs:
  - "{{clipDir}}/video.prompt.txt"
checks:
  - id: prompt-exists
    cmd: test -s {{clipDir}}/video.prompt.txt
    description: Video prompt written
---

# Build Video Prompt — {{shotId}}

Run the helper:

```bash
mkdir -p {{clipDir}}
node scripts/build-shot-prompt.js --shot {{shotId}} --target video > {{clipDir}}/video.prompt.txt
```

The helper output format:

```
---REFERENCES---
keyframes/{{shotId}}/start.png
keyframes/{{shotId}}/end.png       # only if exists — static shots won't have one
---PROMPT---
<full prompt text here>
```

## Rules

- The video `--target` mode adds a camera-movement block derived from `shot.camera_move` and a duration hint derived from `shot.duration_s`. Never hand-edit the prompt — fix the helper if output is wrong.
- The helper emits `keyframes/{{shotId}}/end.png` only when that file exists on disk. Static shots produced only a start frame and will interpolate-from-hold in the video model.
