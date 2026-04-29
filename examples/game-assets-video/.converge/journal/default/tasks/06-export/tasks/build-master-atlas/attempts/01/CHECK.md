# Checks: 06-export/build-master-atlas

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## master-atlas-or-skipped
**Description**: Master atlas is fresh in export/full modes; cleanly skipped otherwise
**Command**: `python -c "
import json, sys
mode = 'sprites' or 'sprites'
if mode in ('export', 'full'):
    a = json.load(open('assets/atlas.json'))
    n = sum(len(s['frames']) for slices in a['categories'].values() for s in slices)
    assert n > 0, 'master atlas has zero frames'
    print(f'master atlas OK ({n} frames)')
else:
    print(f'skipped (stop_after={mode}) — atlas maintained by scene manifests')
"
`