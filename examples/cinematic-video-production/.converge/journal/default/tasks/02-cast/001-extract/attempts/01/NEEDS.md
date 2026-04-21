# Needs: 02-cast/001-extract

## Description

Parse screenplay.fountain and emit characters.json.

## Inputs

- `screenplay.fountain`
- `story-bible.md`

## Expected Outputs

- `characters.json`

## Checks

- **characters-json-exists**: characters.json written and non-empty
- **characters-json-valid**: characters.json is valid JSON
- **characters-have-required-fields**: Every character has id, name, role, visual_description
