---
id: 06-storyboard
title: Storyboard — Thumbnail per Shot
description: Generate a low-detail thumbnail per shot for a human review gate before expensive keyframe + video work.
dependencies:
  - 05-breakdown
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - storyboard
  - thumbnail
  - image
inputs:
  - shots.json
  - scenes.json
  - characters.json
  - locations.json
  - style-guide.md
outputs:
  - storyboard/**/*.png
  - storyboard/index.html
checks:
  - id: at-least-one-thumb
    cmd: find storyboard -name '*.png' -type f | wc -l  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"
    description: At least one storyboard thumbnail generated
  - id: every-shot-has-thumb
    cmd: node -e "const s=require('./shots.json');const fs=require('fs');for(const x of s){if(!fs.existsSync('storyboard/'+x.id+'.png')){process.exit(1)}}"
    description: Every shot has a storyboard thumbnail
---

# Storyboard

Cheap, fast thumbnails for the whole film. This is the last human-review gate before expensive keyframe + video generation.

Each thumbnail is low-detail on purpose — composition, not finish. Skip wardrobe and environment fidelity. A pencil-sketch aesthetic works.

WBS spawns one thumb task per shot; all run in parallel.
