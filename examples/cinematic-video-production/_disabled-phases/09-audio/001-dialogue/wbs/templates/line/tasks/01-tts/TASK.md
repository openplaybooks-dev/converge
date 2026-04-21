---
id: "{{shotId}}"
title: "Dialogue — {{shotId}}"
description: Synthesize dialogue lines for shot {{shotId}} and write the mix to clips/*/dialogue.wav.
skills:
  - audio-generate
tags:
  - audio
  - dialogue
  - tts
inputs:
  - voices.json
  - audio-style.md
outputs:
  - "{{clipDir}}/dialogue.wav"
checks:
  - id: dialogue-wav-exists
    cmd: test -s {{clipDir}}/dialogue.wav
    description: dialogue.wav written
---

# Dialogue — {{shotId}}

Lines to synthesize:

```json
{{dialogueJson}}
```

## Steps

1. Ensure `{{clipDir}}` exists: `mkdir -p {{clipDir}}`.
2. For each line in the array above:
   - Look up `voices.json[voice_spec_id]` where `voice_spec_id = characters[line.character_id].voice_spec_id`.
   - Call:
     ```
     skills/audio-generate {
       mode: "tts",
       text: <line.text>,
       voice_spec: <voice entry>,
       style_notes: <pull delivery hint from audio-style.md>
     }
     ```
   - Save returned WAV to `{{clipDir}}/dialogue-<NN>.wav`.
3. Mix all line WAVs in order using ffmpeg, with 0.3s gaps between lines:
   ```bash
   ffmpeg -f concat -safe 0 -i <concat_list> -c copy {{clipDir}}/dialogue.wav
   ```
   Or, if lines overlap the shot duration, accept clipping; log a warning.
4. Clean up intermediate `dialogue-<NN>.wav` files.

## Rules

- If a character's `voice_spec_id` is missing in `voices.json`, skip that line and append a note to `{{clipDir}}/dialogue.log`.
- Use dry, unprocessed output — all reverb/EQ decisions belong in post.
