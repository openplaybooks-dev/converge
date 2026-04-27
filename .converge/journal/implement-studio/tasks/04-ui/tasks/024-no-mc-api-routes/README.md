# Task Journal: 04-ui/024-no-mc-api-routes

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
  bash -c 'cd packages/converge-studio/src/app/api && allowed="playbooks runs run watch events"; for d in */; do d=${d%/}; case " $allowed " in *" $d "*) ;; *) echo "unexpected: $d"; exit 1 ;; esac; done'
  test -d packages/converge-studio/src/app/api/playbooks && test -d packages/converge-studio/src/app/api/runs && test -d packages/converge-studio/src/app/api/run && test -d packages/converge-studio/src/app/api/watch && test -d packages/converge-studio/src/app/api/events
  bash -c 'count=$(find packages/converge-studio/src/app/api -name route.ts | wc -l | tr -d " "); ok=$(grep -l "runtime = .nodejs." $(find packages/converge-studio/src/app/api -name route.ts) 2>/dev/null | wc -l | tr -d " "); test "$count" = "$ok"'
```