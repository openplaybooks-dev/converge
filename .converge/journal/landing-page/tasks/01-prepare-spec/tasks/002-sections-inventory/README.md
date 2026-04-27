# Task Journal: 01-prepare-spec/002-sections-inventory

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
  test -f apps/landing/.content/sections.json
  test -f apps/landing/.content/sections.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sections.json','utf8'))"
  test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s.length>=8?0:1)"
  test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;const ok=s.every(x=>x.id&&x.title&&x.componentName&&x.intent);process.exit(ok?0:1)"
  test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[0].id==='hero'?0:1)"
  test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[s.length-1].id==='cta-banner'?0:1)"
```