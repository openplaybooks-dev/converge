---
id: 001-gather-idea
title: Gather Idea
description: Read the idea and turn it into a precise product brief for a playful React consumer app
blocking: true
inputs:
  - idea.md
outputs:
  - .stitch/brief.md
checks:
  - id: brief-exists
    cmd: test -f .stitch/brief.md
    description: Brief exists
---
# Gather Idea

Read `idea.md` and create `.stitch/brief.md`.

The brief must lock:

- target audience
- app fantasy and tone
- core user loop
- required screens
- expected playful interactions
- must-have visual cues, including background imagery expectations

Keep it concise and concrete. If the idea is vague, choose a single coherent direction instead of listing multiple options.

