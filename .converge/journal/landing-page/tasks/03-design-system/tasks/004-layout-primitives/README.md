# Task Journal: 03-design-system/004-layout-primitives

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
  for f in Container Section Grid Spacer; do test -f apps/landing/src/components/layout/$f.astro || exit 1; done
  test -d apps/landing/src/components/layout && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/layout')
  test -f apps/landing/src/components/layout/Section.astro && grep -qE 'id\??:|id:\s*string|Astro\.props' apps/landing/src/components/layout/Section.astro
  test -f apps/landing/src/components/layout/Container.astro && grep -qE 'max-w-' apps/landing/src/components/layout/Container.astro
```