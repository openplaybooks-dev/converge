# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **stage-json-exists**
- ❌ **stage-silhouette-exists**
- ❌ **stage-json-has-required-shape**
- ❌ **stage-silhouette-not-tiny**

## ❌ stage-json-exists

**Command**: `test -s assets/scenes/forest-tutorial/stage.json`
**Exit code**: 1

## ❌ stage-silhouette-exists

**Command**: `test -s assets/scenes/forest-tutorial/map.silhouette.png`
**Exit code**: 1

## ❌ stage-json-has-required-shape

**Command**: `python -c "
import json
s = json.load(open('assets/scenes/forest-tutorial/stage.json'))
assert s.get('scene_id') == 'forest-tutorial', f'scene_id mismatch'
world = s.get('world') or {}
w_tiles = world.get('width_tiles')
h_tiles = world.get('height_tiles')
assert isinstance(w_tiles, int) and w_tiles > 0, f'world.width_tiles invalid: {w_tiles}'
assert isinstance(h_tiles, int) and h_tiles > 0, f'world.height_tiles invalid: {h_tiles}'
chunks = s.get('chunks') or []
assert len(chunks) >= 3, f'must have >= 3 chunks for an action-scroller layout; got {len(chunks)}'
cur = 0
for ch in chunks:
    xr = ch.get('x_tiles') or []
    assert len(xr) == 2 and xr[0] == cur, f'chunk {ch.get(\"id\")} x_tiles {xr} does not start at {cur}'
    assert xr[1] > xr[0], f'chunk {ch.get(\"id\")} x_tiles {xr} is empty or reversed'
    cur = xr[1]
assert cur == w_tiles, f'chunks span {cur} tiles but world.width_tiles is {w_tiles}'
bg = s.get('background') or {}
assert isinstance(bg.get('target_width_px'), int), 'background.target_width_px missing'
assert isinstance(bg.get('target_height_px'), int), 'background.target_height_px missing'
elev = s.get('elevation') or []
assert len(elev) >= 8, f'elevation must have >= 8 samples; got {len(elev)}'
assert elev[0].get('x_tile') == 0, f'first elevation sample must be at x_tile=0'
assert elev[-1].get('x_tile') == w_tiles, f'last elevation sample must be at x_tile={w_tiles}'
ys = [e.get('y_tile') for e in elev if isinstance(e.get('y_tile'), int)]
assert len(set(ys)) > 1, 'elevation must vary across the map'
assert (max(ys) - min(ys)) >= 4, f'elevation spread must be at least 4 tiles (max-min); got {max(ys) - min(ys)}'
beats = s.get('beats') or []
assert len(beats) >= 4, f'beats must have >= 4 entries (spawn → first → middle → exit); got {len(beats)}'
kinds = [b.get('kind') for b in beats]
assert 'spawn' in kinds, 'beats must include a spawn'
assert 'exit' in kinds, 'beats must include an exit'
platforms = s.get('platforms') or []
hazards = s.get('hazards') or []
# The strict floors here match the prompt's hard rules; very long
# 'tutorial-intro' scenes that genuinely have no threats can pass
# platforms=2/hazards=0 by setting scene.gameplay.scene_kind='tutorial-intro'.
kind = (((__import__('json').load(open('assets/scenes.json')) or [{}])[0]).get('gameplay') or {}).get('scene_kind') if False else None
assert len(platforms) >= 2, f'must have >= 2 non-trivial platforms (ledge/elevated); got {len(platforms)}'
assert len(hazards) >= 1, f'must have >= 1 hazard for action-scroller rhythm; got {len(hazards)}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 3, in <module>
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/stage.json'
```

## ❌ stage-silhouette-not-tiny

**Command**: `python -c "
from PIL import Image
w, h = Image.open('assets/scenes/forest-tutorial/map.silhouette.png').size
assert w >= 1024 and h >= 256, f'silhouette too small: {w}x{h} (expected >= 1024x256)'
assert w / max(h, 1) >= 2.5, f'silhouette must be wide; got aspect {w}/{h} = {w/max(h,1):.2f}'
"
`
**Exit code**: 1
**Output**:
```
Traceback (most recent call last):
  File "<string>", line 3, in <module>
  File "/opt/homebrew/Caskroom/miniconda/base/lib/python3.12/site-packages/PIL/Image.py", line 3513, in open
    fp = builtins.open(filename, "rb")
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
FileNotFoundError: [Errno 2] No such file or directory: 'assets/scenes/forest-tutorial/map.silhouette.png'
```
