---
id: "{{id}}"
title: "Character Ref: {{charName}}"
tags:
  - character
  - reference
inputs:
  - sprites.json
outputs:
  - "characters/{{charId}}/ref.png"
  - "characters/{{charId}}/ref.prompt.txt"
checks:
  - id: ref-exists
    description: Character reference image exists
    cmd: node -e "const fs=require('fs');if(!fs.existsSync('characters/{{charId}}/ref.png')){console.error('Missing ref for {{charId}}');process.exit(1)}"
  - id: single-image
    description: Reference is a SINGLE image, not a sheet
    cmd: python -c "from PIL import Image; img=Image.open('characters/{{charId}}/ref/ref.png'); print(f'Resolution: {img.size}')"
---

# Character Reference — {{charName}}

Generate a **SINGLE reference image** (not a sheet) for **{{charName}}** ({{charId}}).

## Details

- **Character ID**: {{charId}}
- **Palette**: {{charPalette}}

## Task

Execute the generation script:

```
python scripts/generate_character_ref.py "{{charId}}" "{{charName}}" "{{charDescription}}" "{{charPalette}}"
```

**CRITICAL**: The output must be ONE single image (128x128), not multiple poses or a reference sheet.

This writes:
- `characters/{{charId}}/ref/ref.png` — ONE single reference image
- `characters/{{charId}}/ref/ref.prompt.txt` — the generation prompt

## Verification

After running the script, verify:
1. `characters/{{charId}}/ref/ref.png` exists and is a valid PNG file (check file size > 1KB)
2. The image resolution is 128x128 (ONE single image, not a sheet)
