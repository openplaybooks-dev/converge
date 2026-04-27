# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **domain-libs-gone**
- ❌ **marker-written**

## ❌ domain-libs-gone

**Command**: `test -z "$(ls packages/studio/src/lib/gateway-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/openclaw-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/websocket*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/agent-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/onboarding-*.ts 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(ls packages/studio/src/lib/gateway-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/openclaw-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/websocket*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/agent-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/onboarding-*.ts 2>/dev/null)"
```

## ❌ marker-written

**Command**: `test -f .converge/studio-state/dropped-domain-libs.txt`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/dropped-domain-libs.txt
```
