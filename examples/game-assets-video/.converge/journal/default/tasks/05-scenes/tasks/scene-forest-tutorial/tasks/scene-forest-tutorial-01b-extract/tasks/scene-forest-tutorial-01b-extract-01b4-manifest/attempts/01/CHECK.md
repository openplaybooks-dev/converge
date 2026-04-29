# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-01b-extract/scene-forest-tutorial-01b-extract-01b4-manifest

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-manifest-exists
**Description**: manifest.json was written
**Command**: `test -s assets/scenes/forest-tutorial/extracted/manifest.json`

## bg-manifest-has-three-layers
**Description**: manifest contains all three layer entries (far / mid / near)
**Command**: `python -c "
import json
m = json.load(open('assets/scenes/forest-tutorial/extracted/manifest.json'))
layers = m.get('layers') or {}
missing = [l for l in ('far', 'mid', 'near') if l not in layers]
assert not missing, f'manifest missing layer entries: {missing}'
"
`