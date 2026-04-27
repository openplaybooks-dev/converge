# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **no-legacy-websocket**

## ❌ no-legacy-websocket

**Command**: `test -z "$(grep -rl 'useWebSocket\|STORAGE_GATEWAY_URL\|gateways/connect\|gateway-ws' packages/converge-studio/src 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rl 'useWebSocket\|STORAGE_GATEWAY_URL\|gateways/connect\|gateway-ws' packages/converge-studio/src 2>/dev/null)"
```
