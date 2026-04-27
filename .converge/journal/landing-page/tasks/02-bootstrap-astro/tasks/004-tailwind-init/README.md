# Task Journal: 02-bootstrap-astro/004-tailwind-init

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
  test -f apps/landing/tailwind.config.mjs
  test -f apps/landing/src/styles/globals.css
  test -f apps/landing/src/styles/globals.css && grep -qE '@import\s+"tailwindcss"|@tailwind\s+(base|components|utilities)' apps/landing/src/styles/globals.css
  test -f apps/landing/tailwind.config.mjs && grep -qE "src/.*astro|src/.*\\{astro" apps/landing/tailwind.config.mjs
  test -f apps/landing/tailwind.config.mjs && test -f apps/landing/.content/brand.json && grep -qE 'indigo|6366F1' apps/landing/tailwind.config.mjs
```