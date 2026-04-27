---
title: Build Gallery
description: Static viewer/gallery.html — one card per character with three.js + OrbitControls + AnimationMixer auto-play.
wbs:
  type: shell
  path: scripts/build_gallery.js
dependencies: [05-meshy-refine]
outputs:
  - viewer/gallery.html
checks:
  - id: gallery-references-all
    cmd: |
      node -e "const fs=require('fs');const c=require('./assets/characters.json');const h=fs.readFileSync('viewer/gallery.html','utf-8');for(const x of c)if(!h.includes('characters/'+x.id+'/model.glb'))process.exit(1)"
    description: gallery.html references every character GLB
  - id: gallery-imports-three
    cmd: |
      node -e "const fs=require('fs');const h=fs.readFileSync('viewer/gallery.html','utf-8');for(const x of ['GLTFLoader','OrbitControls','AnimationMixer'])if(!h.includes(x))process.exit(1)"
    description: gallery.html imports GLTFLoader + OrbitControls + AnimationMixer
tags: [build, viewer]
---

# Build Gallery

Per-character cards loading each `model.glb` with `GLTFLoader` + `OrbitControls`. Auto-bbox-fits each camera so models center regardless of size. If a character has animation clips (i.e. is a humanoid that completed task 07), the first clip is auto-played via `AnimationMixer`.

Loaded from a CDN via importmap, no build step. Open with `open viewer/gallery.html` in Chromium-based browsers (Firefox restricts file:// ESM imports — use `npx http-server` for Firefox).
