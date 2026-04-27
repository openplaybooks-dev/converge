# Task Journal: 00-visual-target

## Current attempt — `attempts/wip/`

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
  test -s assets/visual-target.png
  python -c "import re; md=open('ASSETS.md').read(); rows=[l for l in md.splitlines() if l.startswith('|') and '---' not in l]; bad=[l for l in rows[1:] if not re.search(r'\\d+\\s*[xX×]\\s*\\d+', l)]; assert not bad, f'rows missing pixel sizes: {bad[:3]}'"

  test -s assets/sprites.json
```