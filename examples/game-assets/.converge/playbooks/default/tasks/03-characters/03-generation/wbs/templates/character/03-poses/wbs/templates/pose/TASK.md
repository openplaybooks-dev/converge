---
id: "{{char_id}}-pose-{{pose_name}}"
title: "Generate {{char_name}} {{pose_name}} pose"
description: "{{pose_description}}"
outputs:
  - "assets/characters/{{char_id}}/poses/{{pose_name}}.png"
checks:
  - id: pose-exists
    cmd: test -s assets/characters/{{char_id}}/poses/{{pose_name}}.png
    description: Pose image exists
tags:
  - character
  - pose
---

# Generate {{char_name}} {{pose_name}} Pose

Create {{pose_name}} pose variation for {{char_name}}.

## Character Details

- **ID**: {{char_id}}
- **Name**: {{char_name}}
- **Pose**: {{pose_name}}
- **Palette**: {{palette}}

## Task

Generate {{pose_name}} pose reference image:
- Consistent with character design
- Clear silhouette
- Appropriate for game mechanics

## Output

Create `assets/characters/{{char_id}}/poses/{{pose_name}}.png`:
- PNG format
- Matches character palette
- Ready for animation

## Verification

- Pose image exists
- Matches character style
- Clear and readable
