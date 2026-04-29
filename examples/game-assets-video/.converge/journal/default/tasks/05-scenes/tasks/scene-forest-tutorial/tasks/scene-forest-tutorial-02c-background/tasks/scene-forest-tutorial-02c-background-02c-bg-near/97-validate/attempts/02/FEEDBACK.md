# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **bg-near-validator-no-high-severity**

## ❌ bg-near-validator-no-high-severity

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
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 8, in <module>
AssertionError: 3 segment(s) flagged with severity=high: [(2, ['BAD-SEAM', 'WEAK-CONTENT']), (5, ['OFF-MACRO']), (9, ['BAD-SEAM', 'OFF-MACRO', 'WEAK-CONTENT'])]
```
