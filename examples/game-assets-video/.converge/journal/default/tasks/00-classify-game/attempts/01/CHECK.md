# Checks: 00-classify-game

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## game-json-exists
**Description**: assets/game.json was written
**Command**: `test -s assets/game.json`

## game-type-valid
**Description**: game.json declares a recognized game_type and has asset_categories
**Command**: `python -c "
import json
g = json.load(open('assets/game.json'))
gt = g.get('game_type')
valid = {'platformer','side-scrolling-action','top-down-rpg','top-down-shooter','vertical-shooter'}
assert gt in valid, f'unknown game_type {gt!r}'
assert (g.get('asset_categories') or {}), 'asset_categories missing'
"
`