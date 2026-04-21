---
id: "{{shotId}}"
title: "SFX — {{shotId}}"
description: Synthesize and mix all SFX cues for shot {{shotId}}.
skills:
  - audio-generate
tags:
  - audio
  - sfx
inputs:
  - audio-style.md
outputs:
  - "{{clipDir}}/sfx.wav"
checks:
  - id: sfx-wav-exists
    cmd: test -s {{clipDir}}/sfx.wav
    description: sfx.wav written
---

# SFX — {{shotId}}

Cues:

```json
{{sfxCuesJson}}
```

Shot duration: {{durationS}}s.

## Steps

1. `mkdir -p {{clipDir}}`.
2. For each cue in the array, call:
   ```
   skills/audio-generate {
     mode: "sfx",
     description: <cue string>,
     duration_s: {{durationS}},
     style_notes: <pull from audio-style.md — density, naturalism>
   }
   ```
3. Save as `{{clipDir}}/sfx-<NN>.wav`.
4. Mix all cues on top of each other using ffmpeg (`amix`), trim to `{{durationS}}s`:
   ```bash
   ffmpeg -i sfx-01.wav -i sfx-02.wav -filter_complex amix=inputs=<N>:duration=first -t {{durationS}} {{clipDir}}/sfx.wav
   ```
5. Clean up intermediates.

## Rule

Match the density policy from `audio-style.md`. If the film is sparse, a single wind bed beats three cues stacked.
