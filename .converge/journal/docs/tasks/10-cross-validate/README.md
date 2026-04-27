# Task Journal: 10-cross-validate

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
  test -f docs/_validation-report.json && node -e "JSON.parse(require('fs').readFileSync('docs/_validation-report.json','utf8'))"
  node -e "const r=require('./docs/_validation-report.json');process.exit((r.staleClaims||[]).length===0?0:1)"
  node -e "const r=require('./docs/_validation-report.json');process.exit((r.missingSources||[]).length===0?0:1)"
  node .converge/playbooks/docs/scripts/validate-docs.mjs
```