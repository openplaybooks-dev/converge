---
id: "{{nnn}}-02-generate"
title: "Generate Video — {{shotId}}"
description: Invoke video-generate with start + (optional) end keyframes for deterministic interpolation.
dependencies:
  - "{{nnn}}-01-prompt"
skills:
  - video-generate
tags:
  - shot
  - video
  - generate
inputs:
  - "{{clipDir}}/video.prompt.txt"
  - "keyframes/{{shotId}}/start.png"
outputs:
  - "{{clipDir}}/video.mp4"
  - "{{clipDir}}/video.seed.txt"
checks:
  - id: video-exists
    cmd: test -s {{clipDir}}/video.mp4
    description: Video file rendered
  - id: video-nonzero
    cmd: node -e "const fs=require('fs');if(fs.statSync('{{clipDir}}/video.mp4').size<1000){process.exit(1)}"
    description: Video file is at least 1KB
  - id: seed-recorded
    cmd: test -s {{clipDir}}/video.seed.txt
    description: Video seed recorded
---

# Generate Video — {{shotId}}

Parse `{{clipDir}}/video.prompt.txt` into references + prompt. The references block may contain one path (start only) or two paths (start + end).

Call:

```
skills/video-generate {
  first_frame_image: "keyframes/{{shotId}}/start.png",
  last_frame_image:  "keyframes/{{shotId}}/end.png",   // omit if end frame does not exist
  prompt: <PROMPT block from video.prompt.txt>,
  duration_s: {{durationS}},
  aspect_ratio: "21:9",
  seed: "auto"
}
```

Write the returned video to `{{clipDir}}/video.mp4` and seed to `{{clipDir}}/video.seed.txt`.

## Start + End frames

Having both start and end as locked photoreal frames turns img2vid into a bracketed interpolation problem. Backends that support "keyframed" or "bookend" img2vid (Kling 1.6+, Runway Gen-4, Sora 2) will honor both and produce dramatically more consistent motion. Backends that only accept a first frame (Veo 3 basic mode) will ignore `last_frame_image` — the start frame still sets look-and-identity.

## Rules

- If the backend does not support `last_frame_image`, it MUST fall back to first-frame-only and log a warning. It must NOT fail.
- Do NOT regenerate keyframes here — they came from 07-keyframes and are canon. If the clip looks wrong, the fix is upstream (composition or blend), never in this step.
- If the backend does not support `aspect_ratio: "21:9"`, render at 16:9; 10-assemble will handle letterboxing.
