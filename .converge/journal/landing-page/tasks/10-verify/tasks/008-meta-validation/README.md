# Task Journal: 10-verify/008-meta-validation

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
  node .converge/playbooks/landing-page/scripts/check-meta-validation.mjs
  test -d apps/landing/dist && (test -f apps/landing/dist/sitemap-index.xml || test -f apps/landing/dist/sitemap.xml)
  test -f apps/landing/dist/robots.txt
  test -d apps/landing/dist && (test -f apps/landing/dist/og.png || test -f apps/landing/dist/og/default.png)
```