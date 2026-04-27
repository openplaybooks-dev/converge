# Task Journal: 04-drop-mc-only/002-drop-domain-panels

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
  test ! -f packages/studio/src/components/panels/channels-panel.tsx && test ! -f packages/studio/src/components/panels/cron-management-panel.tsx && test ! -f packages/studio/src/components/panels/memory-browser-panel.tsx && test ! -f packages/studio/src/components/panels/multi-gateway-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-config-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-control-panel.tsx && test ! -f packages/studio/src/components/panels/orchestration-bar.tsx && test ! -f packages/studio/src/components/panels/pipeline-tab.tsx && test ! -f packages/studio/src/components/panels/skills-panel.tsx && test ! -f packages/studio/src/components/panels/standup-panel.tsx
  test -f .converge/studio-state/dropped-domain-panels.txt
```