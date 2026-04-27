# FEEDBACK.md — Check Results

**Status**: ❌ 5/6 check(s) failed

- ❌ **no-mc-string**
- ❌ **no-fleet**
- ✅ **no-launch-sequence**
- ❌ **no-dispatch-task**
- ❌ **no-gateway**
- ❌ **no-agent-runtime**

## ❌ no-mc-string

**Command**: `test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
```

## ❌ no-fleet

**Command**: `test -z "$(grep -rl '\bfleet\b\|Fleet[A-Z]\|FLEET' packages/converge-studio/src 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rl '\bfleet\b\|Fleet[A-Z]\|FLEET' packages/converge-studio/src 2>/dev/null)"
```

## ❌ no-dispatch-task

**Command**: `test -z "$(grep -ril 'dispatch a task\|dock an agent\|dock agent\|register your first agent' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -ril 'dispatch a task\|dock an agent\|dock agent\|register your first agent' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)"
```

## ❌ no-gateway

**Command**: `test -z "$(grep -rl '\bGateway\b\|OpenClaw\|openclaw\|gatewayUrl\|gateway_url' packages/converge-studio/src 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rl '\bGateway\b\|OpenClaw\|openclaw\|gatewayUrl\|gateway_url' packages/converge-studio/src 2>/dev/null)"
```

## ❌ no-agent-runtime

**Command**: `test -z "$(grep -rl 'agent-runtime\|agentRuntime\|AgentRuntime\|fleetStatus\|FleetStatus' packages/converge-studio/src 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rl 'agent-runtime\|agentRuntime\|AgentRuntime\|fleetStatus\|FleetStatus' packages/converge-studio/src 2>/dev/null)"
```
