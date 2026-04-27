---
title: Character References
description: WBS — for each character, generate a 1024×1024 reference image (nanobanana) using the class anchor as a Gemini reference.
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [02-class-guides]
tags: [references, wbs]
---

# Character References

Per character: one full-size reference image with **plain neutral studio background** (no green-screen, no chroma-key, no transparency). The class anchor PNG from task 02 is attached as a Gemini reference image so the character reads as belonging to its class.

Output per character:
- `assets/characters/<id>/reference.png` — 1024×1024
- `assets/characters/<id>/SPEC.md` — human-readable spec

Cost: 1 nanobanana call per character. Stub: 0.
