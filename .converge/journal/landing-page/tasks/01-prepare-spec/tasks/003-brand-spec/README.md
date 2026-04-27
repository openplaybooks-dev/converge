# Task Journal: 01-prepare-spec/003-brand-spec

## Current attempt — `attempts/04/`

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
  test -f apps/landing/src/.content/brand.json
  test -f apps/landing/src/.content/brand.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/src/.content/brand.json','utf8'))"
  test -f apps/landing/src/.content/brand.json && node -e "const b=require('./apps/landing/src/.content/brand.json');const ok=b.palette&&Object.keys(b.palette).length>=4;process.exit(ok?0:1)"
  test -f apps/landing/src/.content/brand.json && node -e "const b=require('./apps/landing/src/.content/brand.json');process.exit(b.tagline==='Define done. Converge gets there.'?0:1)"
  test -f apps/landing/src/.content/brand.json && node -e "const b=require('./apps/landing/src/.content/brand.json');const ok=b.voice&&Array.isArray(b.voice.tone)&&b.voice.tone.length>=3;process.exit(ok?0:1)"
```