# Task Journal: 04-drop-mc-only/001-drop-domain-components

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
  test ! -d packages/studio/src/components/openclaw && test -z "$(ls packages/studio/src/components/layout/openclaw-* 2>/dev/null)"
  test ! -d packages/studio/src/components/gateway
  test -z "$(ls packages/studio/src/components/panels/agent-* 2>/dev/null)" && test ! -d packages/studio/src/components/chat
  test -z "$(ls packages/studio/src/components/modals/exec-approval-* 2>/dev/null)" && test -z "$(ls packages/studio/src/components/panels/exec-approval-* 2>/dev/null)" && test ! -d packages/studio/src/components/onboarding
  test -f .converge/studio-state/dropped-domain-components.txt
```