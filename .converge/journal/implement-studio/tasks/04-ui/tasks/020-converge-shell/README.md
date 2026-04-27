# Task Journal: 04-ui/020-converge-shell

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
  test -f packages/converge-studio/src/app/layout.tsx
  test -f packages/converge-studio/src/components/layout/converge-header.tsx
  grep -q 'converge-header' packages/converge-studio/src/app/layout.tsx
  bash -c 'L=packages/converge-studio/src/app/layout.tsx; ! grep -qE "nav-rail|site-header|live-feed|local-mode-banner|launch|onboarding|fleet|gateway|openclaw" $L'
  pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq
```