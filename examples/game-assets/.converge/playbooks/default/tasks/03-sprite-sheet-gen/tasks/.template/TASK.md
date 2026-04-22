---
id: "{{id}}"
title: "Sprite Sheet: {{charName}} - {{state}}"
tags:
  - spritesheet
  - character
  - animation
inputs:
  - assets/sprites.json
  - assets/global/templates/*.png
  - assets/characters/{{charId}}/ref/ref.png
outputs:
  - assets/characters/{{charId}}/{{state}}/spritesheet.png
checks:
  - id: spritesheet-exists
    description: Sprite sheet exists
    cmd: node -e "const fs=require('fs');if(!fs.existsSync('assets/characters/{{charId}}/{{state}}/spritesheet.png')){console.error('Missing spritesheet for {{charId}}/{{state}}');process.exit(1)}"
---

# Sprite Sheet Generation — {{charName}} ({{state}})

Generate sprite sheet for **{{charName}}** ({{charId}}) in **{{state}}** animation state.

## Details

- **Character ID**: {{charId}}
- **Character Name**: {{charName}}
- **Animation State**: {{state}}
- **Frames**: {{framesPerState}}
- **Sprites per Row**: {{spritesPerRow}}
- **Template**: {{template}}

## Task

Execute the generation script:

```bash
python scripts/generate_sprite_sheet_from_template.py "{{charId}}" "{{state}}" --template "{{template}}"
```

This will:
1. Load the template grid ({{template}})
2. Use AI to fill each frame according to the atlas spec
3. Output to `assets/characters/{{charId}}/{{state}}/spritesheet.png`

## Verification

After running the script, verify:
1. `assets/characters/{{charId}}/{{state}}/spritesheet.png` exists
2. The file size is > 10KB (valid PNG)
