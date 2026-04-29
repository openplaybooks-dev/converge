# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **bg-mid-critique-written**
- ❌ **bg-mid-validator-no-high-severity**

## ❌ bg-mid-critique-written

**Command**: `test -s assets/scenes/forest-tutorial/bg-mid/critique/critique.json`
**Exit code**: 1

## ❌ bg-mid-validator-no-high-severity

**Command**: `python -c "
import json
c = json.load(open('assets/scenes/forest-tutorial/bg-mid/critique/critique.json'))
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
  File "<string>", line 3, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/bg-mid/critique/critique.json'
```
