# Checks: 01-story/003-treatment

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## treatment-exists
**Description**: Treatment file written and non-empty
**Command**: `test -s treatment.md`

## treatment-has-beats
**Description**: Treatment has at least 10 beats
**Command**: `grep -cE '^- ' treatment.md  | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=10?0:1)"`