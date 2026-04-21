# Needs: 02-cast/002-voice-casting

## Description

Spec a voice profile per character for TTS generation.

## Inputs

- `characters.json`
- `story-bible.md`

## Expected Outputs

- `voices.json`

## Checks

- **voices-json-exists**: voices.json written
- **voices-json-valid**: voices.json is valid JSON
- **voices-cover-characters**: Every referenced voice_spec_id exists in voices.json
