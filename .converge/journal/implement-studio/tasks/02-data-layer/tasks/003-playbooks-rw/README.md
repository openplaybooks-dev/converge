# Task Journal: 02-data-layer/003-playbooks-rw

## Current attempt — `attempts/wip/`

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
  test -f packages/converge-studio/src/lib/converge-adapter/playbooks.ts
  pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
  cd packages/converge-studio && CONVERGE_PROJECT_ROOT=/Users/minh/Documents/converge node --input-type=module -e "import('./src/lib/converge-adapter/playbooks.ts').then(async m=>{const ps=await m.listPlaybooks();process.exit(ps.find(p=>p.name==='oss-standardize')?0:1)}).catch(e=>{console.error(e);process.exit(1)})"
```