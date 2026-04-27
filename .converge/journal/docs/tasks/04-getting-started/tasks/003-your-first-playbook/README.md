# Task Journal: 04-getting-started/003-your-first-playbook

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
  test -f docs/getting-started/your-first-playbook.md
  grep -qE 'converge\s+init' docs/getting-started/your-first-playbook.md
  grep -qE 'converge\s+run' docs/getting-started/your-first-playbook.md
  grep -qE 'TASK\.md' docs/getting-started/your-first-playbook.md
  grep -qE '^checks:|`checks:`|checks block' docs/getting-started/your-first-playbook.md
  test -f docs/getting-started/your-first-playbook.md && wc -w docs/getting-started/your-first-playbook.md | awk '{exit ($1<=1200?0:1)}'
```