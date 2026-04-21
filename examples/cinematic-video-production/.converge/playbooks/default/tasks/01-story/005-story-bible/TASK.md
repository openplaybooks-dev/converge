---
id: 005-story-bible
title: Write Story Bible
description: Lock canonical facts about the world, tone, and rules that every downstream phase must honor.
dependencies:
  - 004-screenplay
inputs:
  - screenplay.fountain
  - idea.md
outputs:
  - story-bible.md
checks:
  - id: bible-exists
    cmd: test -s story-bible.md
    description: Story bible written and non-empty
  - id: bible-has-rules-section
    cmd: grep -qE '^## (World Rules|Universe Rules|Rules)' story-bible.md
    description: Story bible has a rules section
---

# Write Story Bible

The story bible is the canonical reference all downstream phases cite. Everything that must stay consistent across every shot lives here.

## Required sections

```markdown
# Story Bible

## Logline
<copy verbatim from logline.md>

## Theme
<one sentence — what the film is really about>

## Tone
<2-3 adjectives + 1-2 reference films — e.g. "Slow-burn, hopeful, grain-forward. Arrival + The Lighthouse.">

## World Rules
- RULE: <something that must always be true — e.g. "The portal only opens when the lamp is lit at full intensity.">
- RULE: ...
- RULE: ...

## Canon Facts
- FACT: <concrete, checkable fact — e.g. "The island has one lighthouse, one cottage, one jetty. No other structures.">
- FACT: ...

## Continuity Anchors
- <props that recur and must look identical across shots>
- <weather / time-of-day progressions the story requires>
- <lighting states — e.g. "lamp off / warming up / full beam / flickering">

## What This Film Is Not
- <explicitly forbidden elements — violence, exposition, on-screen text, etc. Pull from idea.md non-goals.>
```

## Rules

- Facts must be derivable from `idea.md` or `screenplay.fountain`. Do not invent.
- Every RULE should be testable ("is the lamp lit in this shot?").
- Keep it **short and load-bearing**. This file is read into the prompt of every downstream artifact — brevity matters.
