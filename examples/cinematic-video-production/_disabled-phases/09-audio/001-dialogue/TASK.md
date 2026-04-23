---
id: 001-dialogue
title: Generate Dialogue TTS
description: For each shot with dialogue, synthesize voices and mix into clips/{slug}/dialogue.wav.
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - audio
  - dialogue
  - tts
inputs:
  - shots.json
  - voices.json
  - audio-style.md
outputs:
  - clips/**/dialogue.wav
checks:
  - id: at-least-one-dialogue
    cmd: find clips -name 'dialogue.wav' -type f 2>/dev/null | wc -l | awk '{if ($1 >= 0) exit 0; exit 1}'
    description: Dialogue pass ran (zero is OK — shots may have no dialogue)
---

# Dialogue

WBS iterates over every shot in `shots.json` whose `dialogue` array is non-empty. For each such shot, spawn a task that:

1. For each line, calls `audio-generate` with `{ mode: "tts", text: line.text, voice_spec: voices[line.character_id] }`.
2. Mixes all lines in shot order with short gaps.
3. Writes the mix to `clips/{NNN}-{slug}/dialogue.wav`.

Shots with no dialogue are skipped — the 10-assemble phase will set `dialogue: null` in `clips.json` for those.
