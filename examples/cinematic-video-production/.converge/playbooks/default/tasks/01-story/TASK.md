---
id: 01-story
title: Story Development
description: Expand idea.md into a full screenplay and story bible via logline → synopsis → treatment → screenplay.
tags:
  - writing
  - narrative
inputs:
  - idea.md
outputs:
  - logline.md
  - synopsis.md
  - treatment.md
  - screenplay.fountain
  - story-bible.md
checks:
  - id: screenplay-exists
    cmd: test -s screenplay.fountain
    description: Screenplay was written and is non-empty
  - id: story-bible-exists
    cmd: test -s story-bible.md
    description: Story bible was written and is non-empty
---

# Story Development

Turn the single-paragraph pitch in `idea.md` into a shootable screenplay and a story bible that locks down canon facts (world rules, tone, theme) for every downstream phase to reference.

Children execute sequentially: each one reads the prior output and extends it.
