---
id: 003-treatment
title: Write Treatment
description: Beat-sheet treatment expanding the synopsis into scene-level beats.
dependencies:
  - 002-synopsis
inputs:
  - synopsis.md
outputs:
  - treatment.md
checks:
  - id: treatment-exists
    cmd: test -s treatment.md
    description: Treatment file written and non-empty
  - id: treatment-has-beats
    cmd: grep -cE '^- ' treatment.md | awk '{if ($1 >= 10) exit 0; exit 1}'
    description: Treatment has at least 10 beats
---

# Write Treatment

Expand the synopsis into a numbered beat-sheet treatment. Each beat is a scene-sized chunk of story.

## Shape

```markdown
# Treatment

## Act 1
- **Beat 1 — <location, time-of-day>.** <2-3 sentences describing what happens.>
- **Beat 2 — <location, time-of-day>.** ...

## Act 2
- **Beat N — ...** ...

## Act 3
- **Beat N — ...** ...
```

## Rules

- Every beat opens with `**Beat N — <location>, <time-of-day>.**` — these become scene headings later.
- Target beat count: scale to fit `target_duration_minutes`. Roughly 1 beat per 60-90 seconds of runtime.
- Name each distinct location once and reuse it — don't invent new places for minor beats.
- Name characters by their role (e.g. "the keeper", "the child") if not yet named — final names come from 02-cast.
- Cover the full story — setup, rising action, midpoint, climax, resolution.
