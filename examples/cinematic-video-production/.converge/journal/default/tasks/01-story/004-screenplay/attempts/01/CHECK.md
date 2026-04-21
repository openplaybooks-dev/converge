# Checks: 01-story/004-screenplay

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## screenplay-exists
**Description**: Screenplay file written and non-empty
**Command**: `test -s screenplay.fountain`

## screenplay-has-scene-headings
**Description**: Screenplay has at least 5 scene headings
**Command**: `grep -cE '^(INT|EXT|INT/EXT|I/E)\. ' screenplay.fountain  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=5?0:1)"`

## screenplay-has-dialogue
**Description**: Screenplay has at least 3 character cues (dialogue)
**Command**: `grep -cE '^[A-Z][A-Z ]{2,}$' screenplay.fountain  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=3?0:1)"`