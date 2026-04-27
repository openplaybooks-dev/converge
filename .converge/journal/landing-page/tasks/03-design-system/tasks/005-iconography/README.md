# Task Journal: 03-design-system/005-iconography

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
  test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit((all['@iconify-json/lucide']||all['lucide-astro']||all['astro-icon'])?0:1)"
  test -f apps/landing/src/icons/converge-mark.svg && grep -q '<svg' apps/landing/src/icons/converge-mark.svg
  test -f apps/landing/src/icons/convergence-journey.svg && grep -q '<svg' apps/landing/src/icons/convergence-journey.svg
  test -f apps/landing/src/components/ui/Icon.astro
```