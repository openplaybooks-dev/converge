# Task Journal: 01-brand/001-source-rename

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
  test -z "$(grep -ri 'harness' --include='*.ts' packages/core/src/ packages/agentfn/src/ packages/claudefn/src/ packages/acpfn/src/ packages/codets/src/ 2>/dev/null | grep -v node_modules | grep -v auto-verify | grep -v '.converge/')"
  test -z "$(grep -ri 'crew\|crewadd\|sheetsrun' --include='*.ts' packages/ 2>/dev/null | grep -v node_modules | grep -v '.converge/')"
```