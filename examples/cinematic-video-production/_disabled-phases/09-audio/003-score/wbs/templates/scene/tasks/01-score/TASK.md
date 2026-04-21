---
id: "{{sceneId}}"
title: "Score — {{sceneId}}"
description: Generate one music bed for scene {{sceneId}} and copy into each clip folder in the scene.
skills:
  - audio-generate
tags:
  - audio
  - score
inputs:
  - audio-style.md
  - shots.json
outputs:
  - "score/{{sceneId}}.wav"
  - clips/**/music.wav
checks:
  - id: score-bed-exists
    cmd: test -s score/{{sceneId}}.wav
    description: Scene score bed written
---

# Score — {{sceneId}}

Scene context:

- Beat: {{sceneBeat}}
- Tone: {{sceneTone}}
- Time-of-day: {{sceneTimeOfDay}}
- Total scene runtime: {{totalDuration}}s
- Shot IDs in this scene: {{shotIdsJson}}

## Step 1 — consult the cue policy

Read `audio-style.md` → `## Score Cue Policy`. Decide: does this scene get score, or does it stay silent?

If silent: write an empty marker at `score/{{sceneId}}.silent` and exit success. Do NOT produce `music.wav` files for this scene's clips.

## Step 2 — generate

If scored, call:

```
skills/audio-generate {
  mode: "score",
  mood: "<derive from sceneTone + audio-style.md>",
  duration_s: {{totalDuration}},
  bpm_range: "<from audio-style.md>",
  instrumentation: "<from audio-style.md>",
  reference_style: "<from audio-style.md>"
}
```

Write output to `score/{{sceneId}}.wav`.

## Step 3 — fan out to clip folders

For each shot_id in `{{shotIdsJson}}`, find the matching `clips/{NNN}-{shot_id}-*` directory and copy the relevant slice of `score/{{sceneId}}.wav` into it as `music.wav`.

Use ffmpeg to cut a duration-matched slice starting at the shot's cumulative offset within the scene:

```bash
ffmpeg -i score/{{sceneId}}.wav -ss <offset> -t <shot.duration_s> -c copy clips/<clip_dir>/music.wav
```

## Rule

The score plays *continuously* across shots in the same scene — the per-clip `music.wav` slices must line up end-to-end to rebuild the full bed in the NLE. Do not re-generate per shot.
