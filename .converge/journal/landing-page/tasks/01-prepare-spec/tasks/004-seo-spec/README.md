# Task Journal: 01-prepare-spec/004-seo-spec

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
  test -f apps/landing/.content/seo.json
  test -f apps/landing/.content/seo.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/seo.json','utf8'))"
  test -f apps/landing/.content/seo.json && node -e "const s=require('./apps/landing/.content/seo.json').site;['title','description','ogImage','canonical','locale'].forEach(k=>{if(!s[k])process.exit(1)});process.exit(0)"
  test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.home ? 0 : 1)"
  test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.docs ? 0 : 1)"
  test -f apps/landing/.content/seo.json && node -e "process.exit(require('./apps/landing/.content/seo.json').pages?.blog ? 0 : 1)"
```