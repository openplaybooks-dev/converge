# Task Journal: 03-design-system/003-base-components

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
  for f in Button Badge Card CodeBlock Pill Disclosure; do test -f apps/landing/src/components/ui/$f.astro || exit 1; done
  test -d apps/landing/src/components/ui && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*components/ui')
  test -f apps/landing/src/components/ui/Button.astro && grep -qE 'primary|secondary|ghost' apps/landing/src/components/ui/Button.astro
  test -f apps/landing/src/components/ui/CodeBlock.astro && grep -qE 'shiki|astro-code|language-' apps/landing/src/components/ui/CodeBlock.astro
  test -d apps/landing/src/components/ui && test -z "$(find apps/landing/src/components/ui -name '*.tsx' -o -name '*.jsx' -o -name '*.vue' -o -name '*.svelte' 2>/dev/null)"
```