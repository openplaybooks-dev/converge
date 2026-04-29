# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **registry-exists**
- ❌ **registry-has-shape**

## ❌ registry-exists

**Command**: `test -s assets/REGISTRY.json`
**Exit code**: 1

## ❌ registry-has-shape

**Command**: `python -c "import json; r=json.load(open('assets/REGISTRY.json')); assert 'characters' in r and 'shared_props' in r, 'registry missing required top-level keys'"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 1, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/REGISTRY.json'
```
