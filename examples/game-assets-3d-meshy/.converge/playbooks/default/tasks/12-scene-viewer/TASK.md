---
title: Build Scene Viewer
description: viewer/scene.html — full scene with tilemap + skybox + every character + every prop, OrbitControls camera, animated humanoids.
wbs:
  type: shell
  path: scripts/build_scene_viewer.js
dependencies: [07-meshy-animate, 09-environment, 11-scene-layout]
outputs:
  - viewer/scene.html
checks:
  - id: scene-html-imports
    cmd: |
      node -e "const fs=require('fs');const h=fs.readFileSync('viewer/scene.html','utf-8');for(const x of ['GLTFLoader','OrbitControls','AnimationMixer','buildEnvironment'])if(!h.includes(x))process.exit(1)"
    description: scene.html imports the expected modules
  - id: scene-html-references-environment
    cmd: |
      node -e "const fs=require('fs');const h=fs.readFileSync('viewer/scene.html','utf-8');if(!h.includes('environment/scene-shell.js'))process.exit(1)"
    description: scene.html imports scene-shell.js from assets/environment
tags: [build, viewer, scene]
---

# Build Scene Viewer

The marquee deliverable. Static `viewer/scene.html` that:

1. Calls `buildEnvironment(scene, THREE)` from `assets/environment/scene-shell.js` — adds tilemap, skybox, lighting, fog.
2. Loads `assets/scene.json` and instantiates every placement.
3. For every character placement, attaches its Idle animation clip via `AnimationMixer` and plays it on loop.
4. Wires `OrbitControls` for camera (drag to orbit, scroll to zoom, right-click to pan). No WASD — that's `examples/playable-mvp-3d`'s job.

Open with `open viewer/scene.html` in Chrome/Edge/Safari (Firefox needs `npx http-server` due to file:// ESM restrictions).

This is what you actually want to look at after running the pipeline. The per-character `viewer/gallery.html` from task 08 is for asset review; this is for *seeing the world*.
