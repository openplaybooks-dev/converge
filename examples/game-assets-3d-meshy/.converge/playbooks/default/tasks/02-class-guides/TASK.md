---
title: Class Style Guides
description: WBS — for each unique class, generate a style-guide.md + reference.png anchor (nanobanana).
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [01-design]
tags: [style, wbs]
---

# Class Style Guides

The cohesion mechanism. For every unique `class` in `characters.json`, this task spawns one subtask that:
1. Composes a class-anchor prompt from the global art direction (style/palette/mood from `pitch.md`) + every character of that class.
2. Calls the active `image-generate` backend ONCE.
3. Writes `assets/shared/classes/<class>/{reference.png, style-guide.md}`.

`reference.png` is then used as a Gemini reference image for **every** character generation in task 03 — that's how cross-character cohesion is enforced.

Cost: 1 nanobanana call per unique class. Stub: 0.
