# Task: 02-cast/002-voice-casting

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