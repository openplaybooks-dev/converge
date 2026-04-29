# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **bg-manifest-exists**
- ❌ **bg-manifest-has-three-layers**

## ❌ bg-manifest-exists

**Command**: `test -s assets/scenes/forest-tutorial/extracted/manifest.json`
**Exit code**: 1

## ❌ bg-manifest-has-three-layers

**Command**: `python -c "
import json
m = json.load(open('assets/scenes/forest-tutorial/extracted/manifest.json'))
layers = m.get('layers') or {}
missing = [l for l in ('far', 'mid', 'near') if l not in layers]
assert not missing, f'manifest missing layer entries: {missing}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 3, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/extracted/manifest.json'
```
