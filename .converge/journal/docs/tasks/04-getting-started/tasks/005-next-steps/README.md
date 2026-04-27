# Task Journal: 04-getting-started/005-next-steps

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
  test -f docs/getting-started/next-steps.md
  grep -qE '\(/examples/|\(\.\./examples/' docs/getting-started/next-steps.md
  grep -qE '\(/guides/|\(\.\./guides/' docs/getting-started/next-steps.md
  grep -qE '\(/reference/|\(\.\./reference/' docs/getting-started/next-steps.md
  wc -w docs/getting-started/next-steps.md | awk '{exit ($1<=350?0:1)}'
```