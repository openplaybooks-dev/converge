# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **bg-composition-critique-written**
- ❌ **bg-composition-no-high-severity**

## ❌ bg-composition-critique-written

**Command**: `test -s assets/scenes/forest-tutorial/bg-composition.critique.json`
**Exit code**: 1

## ❌ bg-composition-no-high-severity

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
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 3, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/bg-composition.critique.json'
```
