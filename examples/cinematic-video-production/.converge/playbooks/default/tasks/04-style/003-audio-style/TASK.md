---
id: 003-audio-style
title: Write Audio Style Guide
description: Lock score genre, SFX density, dialogue treatment, and mixing approach.
inputs:
  - story-bible.md
  - style-guide.md
outputs:
  - audio-style.md
checks:
  - id: audio-style-exists
    cmd: test -s audio-style.md
    description: audio-style.md written
---

# Write Audio Style Guide

Produce `audio-style.md` — read by every audio task.

## Required sections

```markdown
# Audio Style Guide

## Score
- Genre: <e.g. "Minimal ambient with string pad and low drone">
- Instrumentation: <e.g. "cello, double bass, field recordings of wind and sea, sparse piano">
- BPM range: <e.g. 50-70>
- Key mood: <e.g. "held tension, occasional release">
- What to avoid: <e.g. "orchestral swells, percussion hits, melodic hooks">

## Score Cue Policy
- When score enters: <e.g. "only during moments of internal discovery — never under dialogue">
- When score drops out: <e.g. "any shot with the lamp lit">

## SFX
- Density: <sparse | medium | dense>
- Style: <naturalistic | heightened | hyperreal>
- Foreground cues: <what SFX always appear — e.g. wind, sea, lamp hum>
- Background bed: <constant ambient — e.g. "low sea roar at -28 LUFS throughout exteriors">

## Dialogue
- Delivery bias: <understated | theatrical | naturalistic>
- Treatment: <dry | mild reverb | room tone baked in>
- Pacing: <measured | quick | varies>
- Accent consistency: <per character, pulled from voices.json>

## Mix Targets
- Integrated loudness: <e.g. -23 LUFS (broadcast) or -16 LUFS (streaming)>
- Dialogue priority: <how dialogue sits against score/SFX>

## Reference Films / Albums
<2-4 works whose audio aesthetic this film aspires to>
```

## Rules

- Pull from `story-bible.md` tone and `style-guide.md` pacing.
- Be opinionated. Audio defaults are where AI films most often smell cheap — decide now.
