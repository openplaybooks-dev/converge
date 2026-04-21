# Checks: 02-cast/002-voice-casting

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## voices-json-exists
**Description**: voices.json written
**Command**: `test -s voices.json`

## voices-json-valid
**Description**: voices.json is valid JSON
**Command**: `node -e "JSON.parse(require('fs').readFileSync('voices.json','utf8'))"`

## voices-cover-characters
**Description**: Every referenced voice_spec_id exists in voices.json
**Command**: `node -e "const c=require('./characters.json');const v=require('./voices.json');const ids=new Set(v.map(x=>x.id));for(const x of c){if(x.voice_spec_id&&!ids.has(x.voice_spec_id)){process.exit(1)}}"`