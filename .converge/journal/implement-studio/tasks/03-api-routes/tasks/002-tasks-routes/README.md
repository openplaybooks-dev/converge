# Task Journal: 03-api-routes/002-tasks-routes

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
  test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/route.ts' && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/tasks/[...path]/reset/route.ts'
  find 'packages/converge-studio/src/app/api/playbooks/[name]/tasks' -name 'route.ts' | xargs grep -l "runtime = 'nodejs'" | wc -l | xargs test 3 -eq
  pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```