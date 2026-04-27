# Task Journal: 05-build-layout/002-navigation

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
  test -f apps/landing/src/components/layout/Header.astro
  test -f apps/landing/src/components/layout/Header.astro && grep -qE 'converge-mark|Converge' apps/landing/src/components/layout/Header.astro
  test -f apps/landing/src/components/layout/Header.astro && grep -qE 'href="/docs|href="/docs/' apps/landing/src/components/layout/Header.astro
  test -f apps/landing/src/components/layout/Header.astro && grep -qE 'github\.com/myanlabs/converge' apps/landing/src/components/layout/Header.astro
```