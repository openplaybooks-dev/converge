# Task Journal: 03-rebind-ui/003-build-converge-widgets

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
  test -f packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx
  grep -ql 'listSessions\|listPlaybooks\|useConvergeEvents\|/api/runs\|/api/playbooks\|/api/events' packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx 2>/dev/null
```