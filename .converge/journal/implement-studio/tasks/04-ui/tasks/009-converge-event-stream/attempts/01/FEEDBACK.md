# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ✅ **events-route-exists**
- ❌ **hook-exists**
- ❌ **no-legacy-websocket**
- ✅ **typecheck-passes**

## ❌ hook-exists

**Command**: `test -f packages/converge-studio/src/lib/use-converge-events.ts`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/src/lib/use-converge-events.ts
```

## ❌ no-legacy-websocket

**Command**: `test -z "$(grep -rl 'useWebSocket\|STORAGE_GATEWAY_URL\|gateways/connect\|gateway-ws' packages/converge-studio/src 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -rl 'useWebSocket\|STORAGE_GATEWAY_URL\|gateways/connect\|gateway-ws' packages/converge-studio/src 2>/dev/null)"
```
