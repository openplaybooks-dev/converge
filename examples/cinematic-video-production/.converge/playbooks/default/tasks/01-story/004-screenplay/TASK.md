---
id: 004-screenplay
title: Write Screenplay (Fountain)
description: Produce full screenplay in Fountain format from the treatment.
dependencies:
  - 003-treatment
inputs:
  - treatment.md
outputs:
  - screenplay.fountain
checks:
  - id: screenplay-exists
    cmd: test -s screenplay.fountain
    description: Screenplay file written and non-empty
  - id: screenplay-has-scene-headings
    cmd: grep -cE '^(INT|EXT|INT/EXT|I/E)\. ' screenplay.fountain | awk '{if ($1 >= 5) exit 0; exit 1}'
    description: Screenplay has at least 5 scene headings
  - id: screenplay-has-dialogue
    cmd: grep -cE '^[A-Z][A-Z ]{2,}$' screenplay.fountain | awk '{if ($1 >= 3) exit 0; exit 1}'
    description: Screenplay has at least 3 character cues (dialogue)
---

# Write Screenplay

Convert the treatment into a full screenplay in **Fountain** format. Fountain is plain-text and round-trips to Final Draft / Highland / Slugline — downstream tasks parse it.

## Fountain quick reference

```
INT. LOCATION - DAY

Action description, present tense, visual. No internal monologue.

CHARACTER NAME
(parenthetical, optional)
Dialogue line.

CHARACTER NAME
More dialogue.

EXT. OTHER LOCATION - NIGHT

More action.
```

- Scene headings ALL CAPS, starting with `INT.`, `EXT.`, `INT/EXT.`, or `I/E.`.
- Character cues ALL CAPS on their own line before dialogue.
- Action is plain prose.
- No camera directions in scene text — that's the DP's job, handled in 05-breakdown/002-shots.

## Rules

- One scene per beat in `treatment.md`. Maintain beat order.
- Time-of-day per scene: one of DAY, NIGHT, DAWN, DUSK, GOLDEN HOUR, MAGIC HOUR, CONTINUOUS.
- Name every speaking character. If unnamed in treatment, pick names that suit the genre and stick with them.
- Keep action terse and visual. No "we see" — the camera always sees.
- Total page count target: `target_duration_minutes` pages (Fountain convention: 1 page ≈ 1 minute of screen time).
