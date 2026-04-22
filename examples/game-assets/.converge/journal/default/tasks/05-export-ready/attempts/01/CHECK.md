# Checks: 05-export-ready

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## assets-generated
**Description**: At least one asset was exported
**Command**: `find assets -name '*.png' -type f | wc -l | node -e "process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)"`

## atlas-json-valid
**Description**: Atlas JSON is valid
**Command**: `node -e "const j=require('./assets/characters');console.log('ok')"`