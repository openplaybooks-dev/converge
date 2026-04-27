# Task Journal: 03-characters/03-generation/forest-elf-02-angles

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
  python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/source/source.png'); assert min(im.size)>=256, f'source too small: {im.size}'"

  python -c "from PIL import Image; im=Image.open('assets/characters/forest-elf/ref/canonical/canonical.png'); assert min(im.size)>=64, f'canonical too small: {im.size}'"

  python -c "import json; m=json.load(open('assets/characters/forest-elf/ref/manifest.json')); assert 'canonical_angle' in m and 'rotation_y' in m, f'manifest missing keys: {m}'"

```