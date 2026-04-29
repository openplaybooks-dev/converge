# Task Journal: 00-classify-game

## Current attempt — `attempts/01/`

| File | Purpose |
|------|---------|
| `NEEDS.md` | Needs spec (inputs, outputs, checks defined) |
| `NEEDS.result.md` | Input evaluation (files found, blocked/ready) |
| `TASK.md` | Task instructions for the AI |
| `CHECK.md` | Check spec (ids, commands) |
| `CHECK.result.md` | Check outcomes after execution (pass/fail, output state) |
| `LEARN.md` | Failure analysis from previous attempt (attempt 2+) |
| `data/needs.json` | Machine-readable needs (inputs, outputs, blocked state) |
| `data/check.json` | Machine-readable check definitions |
| `data/facts.json` | Facts collected during execution |

## How to run / resume

```bash
pnpm converge run --step   # run next pending task
pnpm converge run          # run all remaining tasks
```

## Verify checks manually

```bash
  test -s assets/game.json
  python -c "
import json
g = json.load(open('assets/game.json'))
gt = g.get('game_type')
valid = {'platformer','side-scrolling-action','top-down-rpg','top-down-shooter','vertical-shooter'}
assert gt in valid, f'unknown game_type {gt!r}'
assert (g.get('asset_categories') or {}), 'asset_categories missing'
"

```