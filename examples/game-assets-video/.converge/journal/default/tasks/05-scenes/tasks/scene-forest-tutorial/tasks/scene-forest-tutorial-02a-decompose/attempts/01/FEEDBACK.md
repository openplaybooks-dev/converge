# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **scene-plan-exists**
- ❌ **scene-plan-has-layers-and-tiles**

## ❌ scene-plan-exists

**Command**: `test -s assets/scenes/forest-tutorial/scene-plan.json`
**Exit code**: 1

## ❌ scene-plan-has-layers-and-tiles

**Command**: `python -c "
import json
p = json.load(open('assets/scenes/forest-tutorial/scene-plan.json'))
layers = (p.get('bg') or {}).get('layers') or []
assert layers, 'scene-plan.bg.layers empty'
for l in layers:
    regs = l.get('regions') or []
    assert regs, f'layer {l.get(\"id\")!r} has no regions'
tiles = (p.get('tilesheet') or {}).get('tiles') or []
assert tiles, 'scene-plan.tilesheet.tiles empty'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 3, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/scene-plan.json'
```
