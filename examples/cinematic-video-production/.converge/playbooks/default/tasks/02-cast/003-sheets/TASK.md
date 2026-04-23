---
id: 003-sheets
title: Generate Character Reference Sheets
description: For each character in characters.json, spawn a 5-step pipeline generating turnaround, expressions, wardrobe, and a locked ref.json.
dependencies:
  - 001-extract
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - cast
  - reference
  - image
inputs:
  - characters.json
  - story-bible.md
outputs:
  - characters/**/turnaround.png
  - characters/**/expressions.png
  - characters/**/wardrobe-*.png
  - characters/**/ref.json
checks:
  - id: at-least-one-ref-locked
    cmd: find characters -name ref.json -type f | wc -l  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one character reference was locked
  - id: every-character-has-ref
    cmd: node -e "const c=require('./characters.json');const fs=require('fs');for(const x of c){if(!fs.existsSync('characters/'+x.id+'/ref.json')){process.exit(1)}}"
    description: Every character in characters.json has a locked ref.json
---

# Character Reference Sheets

Spawn one reference pipeline per character. Each pipeline runs 5 steps:

1. **01-visual-desc** — emit `characters/{id}/description.md` (expanded locked description).
2. **02-turnaround** — Nano-banana → `characters/{id}/turnaround.png` (front + 3/4 + side + back, neutral expression, T-pose).
3. **03-expressions** — Nano-banana (using turnaround as ref) → `characters/{id}/expressions.png` (neutral/happy/angry/sad/scared strip).
4. **04-wardrobe** — Nano-banana → `characters/{id}/wardrobe-{variant}.png` (one per costume the screenplay calls for).
5. **05-lock** — emit `characters/{id}/ref.json` with every reference file path and the locked `visual_description`. This JSON is what shot prompts cite.

Each step after turnaround passes the prior step's output as a reference image to Nano-banana for identity preservation.

## PNG format (mandatory)

Nano-banana sometimes returns `image/jpeg` bytes. A `.png` file with JPEG
content fails Converge's `valid-png` output validator and stalls convergence.
After writing any image output, normalize it:

```bash
python scripts/to_png.py <output-path>
```

Do this for every image you write in this task. The helper is idempotent (valid
PNGs are re-saved as PNGs).
