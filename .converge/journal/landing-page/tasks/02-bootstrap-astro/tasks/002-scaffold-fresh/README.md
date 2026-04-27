# Task Journal: 02-bootstrap-astro/002-scaffold-fresh

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
  test -d apps/landing/src/pages
  test -f apps/landing/src/pages/index.astro
  test -f apps/landing/astro.config.mjs
  test -f apps/landing/tsconfig.json
  test -d apps/landing/src && ! grep -rIqE 'ScrewFast|AstroWind|Foxi|AstroPaper|Astroship' apps/landing/src/
  test -f apps/landing/package.json && node -e "process.exit(require('./apps/landing/package.json').name === '@converge/landing' ? 0 : 1)"
```