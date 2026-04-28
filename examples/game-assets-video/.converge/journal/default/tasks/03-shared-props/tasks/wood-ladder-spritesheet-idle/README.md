# Task Journal: 03-shared-props/wood-ladder-spritesheet-idle

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
  python -c "from PIL import Image; im=Image.open('assets/objects/wood-ladder/spritesheets/idle/idle.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'"

  python -c "import json; from PIL import Image; a=json.load(open('assets/objects/wood-ladder/spritesheets/idle/idle.atlas.json')); im=Image.open('assets/objects/wood-ladder/spritesheets/idle/idle.png'); m=a['meta']; assert m['cols']>=2 and m['rows']>=1, f\"grid too small: {m}\"; assert len(a['frames'])==m['cols']*m['rows'], f\"frame count != cols*rows: {m}\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\""

  test -s assets/objects/wood-ladder/spritesheets/idle/idle.prompt.txt
```