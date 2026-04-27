# Task Journal: 04-getting-started/001-why-converge

## Current attempt — `attempts/02/`

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
  test -f docs/getting-started/why-converge.md
  head -10 docs/getting-started/why-converge.md | grep -q '^title:' && head -10 docs/getting-started/why-converge.md | grep -q '^sources:'
  grep -q 'define done' docs/getting-started/why-converge.md || grep -q 'Define done' docs/getting-started/why-converge.md
  test -f docs/getting-started/why-converge.md && wc -w docs/getting-started/why-converge.md | awk '{exit ($1<=600?0:1)}'
  test -f docs/getting-started/why-converge.md && wc -w docs/getting-started/why-converge.md | awk '{exit ($1>=200?0:1)}'
```