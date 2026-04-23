---
id: "{{pipelineId}}-02-preview"
title: "Preview blueprint — {{shotId}} {{frame}}"
description: Render the composition to a flat blueprint PNG via PIL.
dependencies:
  - "{{pipelineId}}-01-author-composition"
tags:
  - keyframe
  - composition
  - preview
inputs:
  - "{{compositionPath}}"
outputs:
  - "{{previewPath}}"
checks:
  - id: preview-exists
    cmd: test -s {{previewPath}}
    description: Blueprint preview PNG written
---

# Preview blueprint — {{shotId}} {{frame}}

Render the composition to a flat blueprint:

```bash
python scripts/compose_preview.py {{compositionPath}} --debug
```

Outputs:
- `{{previewPath}}` — flat composite (fed to the blender next step)
- `{{compositionPath%.json}}.debug.png` — same image with element bboxes + labels (for human QC, not fed to the blender)

## Rules

- If preview fails with "element ref missing", the upstream 02-cast or 03-world phase is incomplete for this shot — flag as a blocker, do NOT try to paper over with placeholders.
- Do NOT regenerate the composition here. If the preview looks wrong, fix the composition and re-run this step; don't patch the preview by hand.
