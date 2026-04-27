# Task Journal: 04-ui/001-prune-mc-pages

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
  test ! -d 'packages/converge-studio/src/app/[[...panel]]'
  test -z "$(find packages/converge-studio/src/app -type d \( -iname 'agents' -o -iname 'agent-registry' -o -iname 'orgs' -o -iname 'users' -o -iname 'rbac' \) 2>/dev/null)"
  test ! -d 'packages/converge-studio/src/components/dashboard' && test ! -d 'packages/converge-studio/src/components/panels' && test ! -d 'packages/converge-studio/src/components/onboarding' && test ! -d 'packages/converge-studio/src/components/modals'
  test ! -f 'packages/converge-studio/src/lib/websocket.ts' && test ! -f 'packages/converge-studio/src/lib/device-identity.ts' && test ! -f 'packages/converge-studio/src/lib/plugins.ts'
  test ! -d 'packages/converge-studio/src/app/api/gateways' && test ! -d 'packages/converge-studio/src/app/api/openclaw' && test ! -d 'packages/converge-studio/src/app/api/onboarding' && test ! -d 'packages/converge-studio/src/app/api/projects'
  test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
  pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```