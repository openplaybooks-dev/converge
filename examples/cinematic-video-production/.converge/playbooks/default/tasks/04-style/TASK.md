---
id: 04-style
title: Style — Visual, Palette, Audio Style Guide
description: Freeze the cinematography rules, color palette, and audio aesthetic. These blocks are injected verbatim into every shot prompt.
dependencies:
  - 01-story
tags:
  - style
  - cinematography
  - palette
  - audio
inputs:
  - story-bible.md
  - idea.md
outputs:
  - style-guide.md
  - palette.json
  - palette.png
  - audio-style.md
checks:
  - id: style-guide-exists
    cmd: test -s style-guide.md
    description: style-guide.md written
  - id: palette-exists
    cmd: test -s palette.json
    description: palette.json written
  - id: audio-style-exists
    cmd: test -s audio-style.md
    description: audio-style.md written
---

# Style

Lock the global cinematic style once. Every shot prompt and every audio generation cites these files — there is no per-shot style decision to make.
