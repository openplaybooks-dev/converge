# Task Journal: 02-data-layer/001-core-studio-api-export

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
  test -f packages/core/src/studio-api.ts
  node -e "const e=require('./packages/core/package.json').exports;process.exit(e['./studio-api']?0:1)"
  cd packages/core && pnpm build 2>&1 | tail -3 && node --input-type=module -e "import('@converge/core/studio-api').then(m=>{if(!m.SimpleLogTailer||!m.loadPlaybook)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"
```