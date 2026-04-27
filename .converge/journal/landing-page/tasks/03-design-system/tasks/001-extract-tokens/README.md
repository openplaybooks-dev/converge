# Task Journal: 03-design-system/001-extract-tokens

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
  test -f apps/landing/src/styles/tokens.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/src/styles/tokens.json','utf8'))"
  test -f apps/landing/src/styles/tokens.css
  test -f apps/landing/src/styles/tokens.json && node -e "const t=require('./apps/landing/src/styles/tokens.json');const ok=t.color&&['bg','indigo','text','accent'].every(k=>t.color[k]);process.exit(ok?0:1)"
  test -f apps/landing/src/styles/tokens.css && grep -qE -- '--color-(bg|indigo|text)' apps/landing/src/styles/tokens.css
  test -f apps/landing/src/styles/globals.css && grep -qE "@import.*tokens\.css|@import.*['\"]\./tokens" apps/landing/src/styles/globals.css
```