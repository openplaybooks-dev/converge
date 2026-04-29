# Checks: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02a-decompose

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## scene-plan-exists
**Description**: scene-plan.json was written
**Command**: `test -s assets/scenes/forest-tutorial/scene-plan.json`

## scene-plan-has-layers-and-tiles
**Description**: scene-plan has bg.layers (each with regions) and tilesheet.tiles
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