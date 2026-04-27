# Task Journal: 03-rebind-ui/001-rebind-shell-nav

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
  grep -q '/playbooks' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/runs' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/settings' packages/studio/src/components/layout/nav-rail.tsx
  grep -q 'useConvergeEvents\|/api/search\|/api/events' packages/studio/src/components/layout/header-bar.tsx
```