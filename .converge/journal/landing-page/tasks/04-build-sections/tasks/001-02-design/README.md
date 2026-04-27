# Task Journal: 04-build-sections/001-02-design

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
  test -f apps/landing/.content/sections/hero/DESIGN.md
  test -f apps/landing/.content/sections/hero/DESIGN.md && test $(wc -l < apps/landing/.content/sections/hero/DESIGN.md) -ge 30
  test -f apps/landing/.content/sections/hero/DESIGN.md && grep -qE 'import|components/ui|components/layout' apps/landing/.content/sections/hero/DESIGN.md
```