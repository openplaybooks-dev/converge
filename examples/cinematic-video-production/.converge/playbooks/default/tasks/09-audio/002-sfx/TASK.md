---
id: 002-sfx
title: Generate SFX per Shot
description: For each shot with sfx_cues, synthesize and mix to clips/{slug}/sfx.wav.
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - audio
  - sfx
inputs:
  - shots.json
  - audio-style.md
outputs:
  - clips/**/sfx.wav
checks:
  - id: sfx-pass-ran
    cmd: "true"
    description: SFX pass ran (zero SFX files is valid for films with none)
---

# SFX

For each shot with a non-empty `sfx_cues` array, synthesize each cue and mix to `clips/{NNN}-{slug}/sfx.wav`.
