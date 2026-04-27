# Task Journal: 01-prepare-spec/001-sitemap

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
  test -f apps/landing/.content/sitemap.json
  test -f apps/landing/.content/sitemap.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sitemap.json','utf8'))"
  test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;const set=new Set(routes.map(x=>x.path||x));process.exit(set.has('/') && [...set].some(p=>p.startsWith('/docs/')) ? 0 : 1)"
  test -f apps/landing/.content/sitemap.json && node -e "const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;process.exit(routes.some(x=>(x.path||x)==='/blog') ? 0 : 1)"
```