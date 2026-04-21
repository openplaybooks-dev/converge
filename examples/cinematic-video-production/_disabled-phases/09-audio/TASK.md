---
id: 09-audio
title: Audio — Dialogue, SFX, Score
description: Three parallel sub-phases generating dialogue TTS per line, SFX per cue, and score per scene. All stems land next to their clip's video.mp4.
dependencies:
  - 05-breakdown
tags:
  - audio
inputs:
  - shots.json
  - voices.json
  - audio-style.md
  - scenes.json
outputs:
  - clips/**/dialogue.wav
  - clips/**/sfx.wav
  - clips/**/music.wav
checks:
  - id: clip-dirs-exist
    cmd: test -d clips
    description: clips/ directory exists (should be created by 08-shots)
---

# Audio

Three independent WBS sub-phases. They do not depend on 08-shots (audio can be generated in parallel with video), but they write into the same `clips/{NNN}-{slug}/` folders that 08-shots creates. If audio completes before video, it lands in folders that will be populated later — that is fine.

- `001-dialogue` — TTS per dialogue line, one WAV per shot (mixed down if multiple lines).
- `002-sfx` — one SFX WAV per shot (mixdown of all `sfx_cues`).
- `003-score` — one music bed WAV per scene, copied into every clip folder belonging to that scene.
