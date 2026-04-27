---
title: Meshy Preview (image-to-3D)
description: WBS — for each character, run Meshy image-to-3D in preview mode using their reference.png.
wbs:
  type: nodejs
  path: ./wbs/index.js
dependencies: [03-references]
tags: [meshy, preview, wbs]
---

# Meshy Preview

WBS spawns one task per character that runs `scripts/meshy_step.js <id> preview`, which calls the active `meshy-generate` backend with `mode: "preview"` and `image_url` pointing to the character's reference.png.

Cost: 5 Meshy credits per character (Meshy-6 lowpoly). Stub: 0.

**Live mode caveat**: Meshy's image-to-3D endpoint requires a publicly-reachable URL for `image_url`. The script currently passes a `file://` URL — for live runs, you'll need to either (a) host PNGs on a temp public bucket or (b) extend the meshy backend with an upload step. Stub mode ignores the URL entirely.
