# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **catalog-exists**
- ❌ **catalog-props-have-animation-type**

## ❌ catalog-exists

**Command**: `test -s assets/catalog.json`
**Exit code**: 1

## ❌ catalog-props-have-animation-type

**Command**: `python -c "
import json
cat = json.load(open('assets/catalog.json'))
valid = {'static','loop','trigger'}
for p in cat.get('shared_props', []):
    atype = p.get('animation_type')
    assert atype in valid, f'prop {p.get(\"id\")!r}: animation_type {atype!r} not in {valid}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 3, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/catalog.json'
```
