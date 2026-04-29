# Checks: 01c-catalog-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## catalog-exists
**Description**: assets/catalog.json was written
**Command**: `test -s assets/catalog.json`

## catalog-props-have-animation-type
**Description**: Every shared prop in catalog has animation_type set to static / loop / trigger
**Command**: `python -c "
import json
cat = json.load(open('assets/catalog.json'))
valid = {'static','loop','trigger'}
for p in cat.get('shared_props', []):
    atype = p.get('animation_type')
    assert atype in valid, f'prop {p.get(\"id\")!r}: animation_type {atype!r} not in {valid}'
"
`