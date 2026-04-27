---
title: Environment Build
description: Procedural tilemap-style ground + skybox + lighting + fog. No API call — values derived from idea.md palette.
wbs:
  type: shell
  path: scripts/build_environment.js
dependencies: [01-design]
outputs:
  - assets/environment/scene-shell.js
checks:
  - id: scene-shell-exports
    cmd: |
      node -e "const fs=require('fs');const s=fs.readFileSync('assets/environment/scene-shell.js','utf-8');if(!s.includes('export function buildEnvironment'))process.exit(1)"
    description: scene-shell.js exports buildEnvironment
tags: [environment, deterministic]
---

# Environment Build

Meshy doesn't generate environments. We build one ourselves: an 8×8 tile grid where each tile is an individual `THREE.BoxGeometry` (low-poly tilemap aesthetic), gradient skybox, ambient + directional lighting tuned to the arena, atmospheric fog.

Palette is parsed from `assets/pitch.md` (specifically the `**Palette**:` line). Hex codes are slotted into roles by keyword proximity:
- `sky/background/teal` → bgTop
- `ground/moss/green/earth` → ground
- `accent/amber/warm` → accent
- `bone/white/highlight` → highlight

Missing roles fall back to sensible defaults so a one-color palette doesn't repaint the whole arena.

This task is deterministic — re-running with no input changes is a no-op.
