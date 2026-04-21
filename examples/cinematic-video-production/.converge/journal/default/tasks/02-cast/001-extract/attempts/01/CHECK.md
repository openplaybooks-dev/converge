# Checks: 02-cast/001-extract

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## characters-json-exists
**Description**: characters.json written and non-empty
**Command**: `test -s characters.json`

## characters-json-valid
**Description**: characters.json is valid JSON
**Command**: `node -e "JSON.parse(require('fs').readFileSync('characters.json','utf8'))"`

## characters-have-required-fields
**Description**: Every character has id, name, role, visual_description
**Command**: `node -e "const c=require('./characters.json');for(const x of c){if(!x.id||!x.name||!x.role||!x.visual_description){process.exit(1)}}"`