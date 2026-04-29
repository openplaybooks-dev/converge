# FEEDBACK.md — Check Results

**Status**: ❌ 1/3 check(s) failed

- ✅ **bg-mid-stitched-png-exists**
- ✅ **bg-mid-stitched-atlas-exists**
- ❌ **bg-mid-stitched-width-matches-target**

## ❌ bg-mid-stitched-width-matches-target

**Command**: `python -c "
from PIL import Image
import json
plan = json.load(open('assets/scenes/forest-tutorial/scene-plan.json'))
layer = next(l for l in plan['bg']['layers'] if l['id'] == 'mid')
target_w = layer['target_size'][0]
w, h = Image.open('assets/scenes/forest-tutorial/bg-mid/final.png').size
assert w == target_w, f'stitched width {w} != target {target_w}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 8, in <module>
AssertionError: stitched width 3904 != target 2048
```
