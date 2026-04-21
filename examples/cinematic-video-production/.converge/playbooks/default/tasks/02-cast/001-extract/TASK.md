---
id: 001-extract
title: Extract Characters from Screenplay
description: Parse screenplay.fountain and emit characters.json.
inputs:
  - screenplay.fountain
  - story-bible.md
outputs:
  - characters.json
checks:
  - id: characters-json-exists
    cmd: test -s characters.json
    description: characters.json written and non-empty
  - id: characters-json-valid
    cmd: node -e "JSON.parse(require('fs').readFileSync('characters.json','utf8'))"
    description: characters.json is valid JSON
  - id: characters-have-required-fields
    cmd: node -e "const c=require('./characters.json');for(const x of c){if(!x.id||!x.name||!x.role||!x.visual_description){process.exit(1)}}"
    description: Every character has id, name, role, visual_description
---

# Extract Characters

Read `screenplay.fountain` and emit `characters.json` matching `schemas/characters.schema.json`.

## Rules

- One entry per **speaking or story-critical** character. Extras without lines or story weight are skipped.
- `id`: kebab-case slug derived from name (e.g. `elias-thorn`).
- `role`: one of `protagonist | antagonist | supporting | minor`.
- `visual_description`: **≤ 30 words**, locked. This exact string is injected into every shot prompt the character appears in — make it count. Describe: apparent age, build, skin, hair (color, length, texture), eyes, distinguishing features, posture. **No wardrobe** (that goes on the sheet). No personality adjectives.
- `bio`: 1-2 sentences of history grounding who they are.
- `arc`: one sentence — where they start emotionally, where they end.
- `age`: short string — "early 70s", "late 20s", "about 10".

## Example entry

```json
{
  "id": "elias-thorn",
  "name": "Elias Thorn",
  "role": "protagonist",
  "age": "early 70s",
  "bio": "Retired Atlantic lighthouse keeper. Widowed. Kept the lamp lit for forty years before automation retired him in place.",
  "arc": "Starts resigned to an end-of-life solitude; ends reclaiming purpose through an impossible duty.",
  "visual_description": "Man, early 70s, lean weathered frame, ruddy sun-creased skin, close-cropped white hair, pale grey-blue eyes, deeply lined brow, hands thick-knuckled from rope work.",
  "voice_spec_id": "elias-thorn"
}
```

Write the complete array to `characters.json`.
