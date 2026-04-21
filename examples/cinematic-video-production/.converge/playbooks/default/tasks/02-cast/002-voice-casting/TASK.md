---
id: 002-voice-casting
title: Cast Voices
description: Spec a voice profile per character for TTS generation.
dependencies:
  - 001-extract
inputs:
  - characters.json
  - story-bible.md
outputs:
  - voices.json
checks:
  - id: voices-json-exists
    cmd: test -s voices.json
    description: voices.json written
  - id: voices-json-valid
    cmd: node -e "JSON.parse(require('fs').readFileSync('voices.json','utf8'))"
    description: voices.json is valid JSON
  - id: voices-cover-characters
    cmd: node -e "const c=require('./characters.json');const v=require('./voices.json');const ids=new Set(v.map(x=>x.id));for(const x of c){if(x.voice_spec_id&&!ids.has(x.voice_spec_id)){process.exit(1)}}"
    description: Every referenced voice_spec_id exists in voices.json
---

# Cast Voices

Produce `voices.json` — an array of voice specs consumed later by the `audio-generate` skill for TTS.

## Schema per entry

```json
{
  "id": "elias-thorn",
  "gender": "male | female | nonbinary",
  "age_band": "child | teen | young-adult | adult | elderly",
  "pitch": "low | medium | high",
  "accent": "e.g. 'Cornish English', 'General American', 'neutral'",
  "timbre": "short adjectives — e.g. 'gravelly, worn, slow'",
  "delivery": "default line reading — e.g. 'measured, understated, long pauses'",
  "reference_actor": "optional — e.g. 'Tom Wilkinson type' (used only as style hint, not impersonation)"
}
```

## Rules

- One entry per character with a `voice_spec_id`.
- `id` must match `voice_spec_id` in `characters.json`.
- Keep strings short — these land in TTS prompts verbatim.
- Respect `story-bible.md` tone.
