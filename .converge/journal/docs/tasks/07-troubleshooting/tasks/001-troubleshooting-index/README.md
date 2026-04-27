# Task Journal: 07-troubleshooting/001-troubleshooting-index

## Current attempt — `attempts/03/`

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
  test -f docs/troubleshooting/index.md
  head -10 docs/troubleshooting/index.md | grep -q '^title:' && head -10 docs/troubleshooting/index.md | grep -q '^sources:'
  test $(grep -cE '^\s*-\s+\[|^\*\s+\[|^[0-9]+\.\s+\[' docs/troubleshooting/index.md) -ge 10
  grep -qE '/guides/read-the-journal|\.\./guides/read-the-journal' docs/troubleshooting/index.md
```