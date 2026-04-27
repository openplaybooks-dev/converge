# Task Journal: 04-ui/022-no-mc-data-models

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
  test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
  test -z "$(grep -rl '\bfleet\b\|Fleet[A-Z]\|FLEET' packages/converge-studio/src 2>/dev/null)"
  test -z "$(grep -ril 'launch sequence\|launchsequence\|launch_sequence' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
  test -z "$(grep -ril 'dispatch a task\|dock an agent\|dock agent\|register your first agent' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
  test -z "$(grep -rl '\bGateway\b\|OpenClaw\|openclaw\|gatewayUrl\|gateway_url' packages/converge-studio/src 2>/dev/null)"
  test -z "$(grep -rl 'agent-runtime\|agentRuntime\|AgentRuntime\|fleetStatus\|FleetStatus' packages/converge-studio/src 2>/dev/null)"
```