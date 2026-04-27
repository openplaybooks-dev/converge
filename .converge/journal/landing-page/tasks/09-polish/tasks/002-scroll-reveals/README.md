# Task Journal: 09-polish/002-scroll-reveals

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
  test -f apps/landing/src/styles/animations.css
  test -f apps/landing/src/components/layout/Section.astro && grep -qE 'reveal-on-scroll|fade-in-up|data-reveal' apps/landing/src/components/layout/Section.astro
  test -f apps/landing/src/styles/animations.css && grep -qE 'prefers-reduced-motion' apps/landing/src/styles/animations.css
```