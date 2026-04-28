# Checks: 04-registry-build

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## registry-exists
**Description**: REGISTRY.json was written
**Command**: `test -s assets/REGISTRY.json`

## registry-has-shape
**Description**: REGISTRY.json has characters[] and shared_props[]
**Command**: `python -c "import json; r=json.load(open('assets/REGISTRY.json')); assert 'characters' in r and 'shared_props' in r, 'registry missing required top-level keys'"
`