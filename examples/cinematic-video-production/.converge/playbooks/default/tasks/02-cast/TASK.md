---
id: 02-cast
title: Cast — Extract Characters, Cast Voices, Generate Reference Sheets
description: Extract characters from the screenplay, spec their voices, and generate locked visual reference sheets (turnaround + expressions + wardrobe).
dependencies:
  - 01-story
tags:
  - cast
  - character-design
inputs:
  - screenplay.fountain
  - story-bible.md
outputs:
  - characters.json
  - voices.json
  - characters/**/*.png
  - characters/**/ref.json
checks:
  - id: characters-exists
    cmd: test -s characters.json
    description: characters.json written
  - id: voices-exists
    cmd: test -s voices.json
    description: voices.json written
  - id: character-refs-locked
    cmd: find characters -name ref.json -type f | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least one character ref.json was locked
---

# Cast

All per-shot consistency begins with character references. This phase:

1. Pulls the cast out of the screenplay → `characters.json`.
2. Specs each voice (pitch, accent, age, delivery) → `voices.json`.
3. Spawns a 5-step reference pipeline per character via WBS (visual description → turnaround → expressions → wardrobe → lock).

Downstream shot prompts will cite each character's `ref.json` which names the image files to pass as multi-image references to Nano-banana.
