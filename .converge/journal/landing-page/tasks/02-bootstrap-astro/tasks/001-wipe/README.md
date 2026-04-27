# Task Journal: 02-bootstrap-astro/001-wipe

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
  test -d apps/landing && test ! -d apps/landing/src
  test -d apps/landing && test ! -f apps/landing/astro.config.mjs && test ! -f apps/landing/astro.config.ts && test ! -f apps/landing/astro.config.js
  test -f apps/landing/package.json
  test -f apps/landing/package.json && node -e "process.exit(require('./apps/landing/package.json').name === '@converge/landing' ? 0 : 1)"
  test -f apps/landing/.wiped
```