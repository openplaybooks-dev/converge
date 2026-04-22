---
id: "{{id}}"
title: "Animation Keyframes: {{charName}} - {{state}}"
tags:
  - animation
  - keyframes
  - character
inputs:
  - assets/sprites.json
  - assets/characters/{{charId}}/ref/ref.png
outputs:
  - assets/characters/{{charId}}/{{state}}/frames/*.png
checks:
  - id: keyframes-exist
    description: Animation keyframes exist
    cmd: node -e "const fs=require('fs');const d='assets/characters/{{charId}}/{{state}}/frames';if(!fs.existsSync(d)||fs.readdirSync(d).filter(f=>f.endsWith('.png')).length===0){console.error('No keyframes for {{charId}}/{{state}}');process.exit(1)}"
---

# Animation Keyframes — {{charName}} ({{state}})

Generate animation keyframe sequence for **{{charName}}** ({{charId}}) in **{{state}}** animation state.

## Details

- **Character ID**: {{charId}}
- **Character Name**: {{charName}}
- **Animation State**: {{state}}
- **Palette**: {{palette}}

## Task

Execute the generation script:

```bash
python scripts/generate_keyframes.py "{{charId}}" "{{charName}}" "{{state}}" "{{palette}}"
```

This will:
1. Load the character reference image
2. Generate keyframes for the animation state
3. Output to `assets/characters/{{charId}}/{{state}}/frames/`

## Verification

After running the script, verify:
1. `assets/characters/{{charId}}/{{state}}/frames/` directory exists
2. Contains PNG files for each keyframe
