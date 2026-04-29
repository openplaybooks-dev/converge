# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-97-validate-composition

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-composition-critique-written
**Description**: cross-layer critique JSON was written
**Command**: `test -s assets/scenes/forest-tutorial/bg-composition.critique.json`

## bg-composition-no-high-severity
**Description**: no layer was flagged with severity=high (low-severity issues are accepted)
**Command**: `python -c "
import json
c = json.load(open('assets/scenes/forest-tutorial/bg-composition.critique.json'))
layers = c.get('layers') or []
high = [l for l in layers if l.get('decision') == 'fix' and l.get('severity') == 'high']
if high:
    tags = [(l.get('layer'), l.get('issues')) for l in high]
    raise AssertionError(f'{len(high)} layer(s) flagged with severity=high: {tags}')
"
`