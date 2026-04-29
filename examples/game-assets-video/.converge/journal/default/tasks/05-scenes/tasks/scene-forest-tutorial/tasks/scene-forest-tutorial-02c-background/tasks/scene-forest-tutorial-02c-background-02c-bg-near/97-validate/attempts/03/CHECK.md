# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/97-validate

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-near-critique-written
**Description**: critique JSON was written
**Command**: `test -s assets/scenes/forest-tutorial/bg-near.critique.json`

## bg-near-validator-no-high-severity
**Description**: no segment was flagged with severity=high (low-severity issues are accepted)
**Command**: `python -c "
import json
c = json.load(open('assets/scenes/forest-tutorial/bg-near.critique.json'))
segs = c.get('segments') or []
high = [s for s in segs if s.get('decision') == 'fix' and s.get('severity') == 'high']
if high:
    tags = [(s.get('index'), s.get('issues')) for s in high]
    raise AssertionError(f'{len(high)} segment(s) flagged with severity=high: {tags}')
"
`