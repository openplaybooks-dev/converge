# Task Journal: 08-generate-assets/001-favicon-set

## Current attempt — `attempts/02/`

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
  test -f apps/landing/public/favicon.svg
  test -f apps/landing/public/apple-touch-icon.png
  test -f apps/landing/public/site.webmanifest && node -e "JSON.parse(require('fs').readFileSync('apps/landing/public/site.webmanifest','utf8'))"
  test -f apps/landing/public/site.webmanifest && node -e "const m=require('./apps/landing/public/site.webmanifest');process.exit(m.name==='Converge'?0:1)"
```