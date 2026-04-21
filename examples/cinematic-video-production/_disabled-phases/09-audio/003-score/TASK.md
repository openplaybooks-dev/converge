---
id: 003-score
title: Generate Score per Scene
description: One music bed per scene. Copied into every clip folder belonging to that scene.
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - audio
  - score
  - music
inputs:
  - scenes.json
  - shots.json
  - audio-style.md
outputs:
  - clips/**/music.wav
  - score/**/*.wav
checks:
  - id: score-ran
    cmd: "true"
    description: Score pass ran
---

# Score

One music bed per scene, generated long enough to cover the scene's total shot duration. The bed is written once to `score/{scene_id}.wav`, then copied into every clip folder belonging to that scene as `music.wav`.

The score-cue policy from `audio-style.md` determines which scenes get score at all — not every scene does.
