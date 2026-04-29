# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/99-stitch

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## bg-mid-stitched-png-exists
**Description**: stitched bg-mid.png exists
**Command**: `test -s assets/scenes/forest-tutorial/bg-mid/final.png`

## bg-mid-stitched-atlas-exists
**Description**: stitched bg-mid.atlas.json exists
**Command**: `test -s assets/scenes/forest-tutorial/bg-mid/final.atlas.json`

## bg-mid-stitched-width-matches-target
**Description**: stitched width matches scene-plan target_size[0]
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