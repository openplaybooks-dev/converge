# Task Journal: 04-build-sections/007-03-build

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
  test -f apps/landing/src/components/sections/Faq.astro
  test -f apps/landing/src/components/sections/Faq.astro && grep -qE '<Section\s' apps/landing/src/components/sections/Faq.astro
  test -f apps/landing/src/components/sections/Faq.astro && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*Faq\.astro')
  test -f apps/landing/src/components/sections/Faq.astro && ! grep -qE '#[0-9a-fA-F]{3,6}\b' apps/landing/src/components/sections/Faq.astro
  test -f apps/landing/src/components/sections/Faq.astro && ! grep -qE 'Lorem|placeholder content|TBD|FIXME|TODO:' apps/landing/src/components/sections/Faq.astro
```