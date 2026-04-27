# Checks: 04-ui/022-no-mc-data-models

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## no-mc-string
**Description**: 'Mission Control' literal does not appear in src/ or messages/
**Command**: `test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`

## no-fleet
**Description**: No 'fleet' identifier or string in src/
**Command**: `test -z "$(grep -rl '\bfleet\b\|Fleet[A-Z]\|FLEET' packages/converge-studio/src 2>/dev/null)"`

## no-launch-sequence
**Description**: No 'launch sequence' / 'launchSequence' / 'LaunchSequence' references
**Command**: `test -z "$(grep -ril 'launch sequence\|launchsequence\|launch_sequence' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`

## no-dispatch-task
**Description**: No 'dispatch a task' / 'dock an agent' UI strings
**Command**: `test -z "$(grep -ril 'dispatch a task\|dock an agent\|dock agent\|register your first agent' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`

## no-gateway
**Description**: No gateway/openclaw type names or imports
**Command**: `test -z "$(grep -rl '\bGateway\b\|OpenClaw\|openclaw\|gatewayUrl\|gateway_url' packages/converge-studio/src 2>/dev/null)"`

## no-agent-runtime
**Description**: No agent-runtime / fleet-status type or import
**Command**: `test -z "$(grep -rl 'agent-runtime\|agentRuntime\|AgentRuntime\|fleetStatus\|FleetStatus' packages/converge-studio/src 2>/dev/null)"`