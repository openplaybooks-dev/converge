# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **openclaw-gone**
- ✅ **gateway-gone**
- ❌ **agent-and-chat-gone**
- ❌ **exec-approval-and-onboarding-gone**
- ❌ **marker-written**

## ❌ openclaw-gone

**Command**: `test ! -d packages/studio/src/components/openclaw && test -z "$(ls packages/studio/src/components/layout/openclaw-* 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test ! -d packages/studio/src/components/openclaw && test -z "$(ls packages/studio/src/components/layout/openclaw-* 2>/dev/null)"
```

## ❌ agent-and-chat-gone

**Command**: `test -z "$(ls packages/studio/src/components/panels/agent-* 2>/dev/null)" && test ! -d packages/studio/src/components/chat`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(ls packages/studio/src/components/panels/agent-* 2>/dev/null)" && test ! -d packages/studio/src/components/chat
```

## ❌ exec-approval-and-onboarding-gone

**Command**: `test -z "$(ls packages/studio/src/components/modals/exec-approval-* 2>/dev/null)" && test -z "$(ls packages/studio/src/components/panels/exec-approval-* 2>/dev/null)" && test ! -d packages/studio/src/components/onboarding`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(ls packages/studio/src/components/modals/exec-approval-* 2>/dev/null)" && test -z "$(ls packages/studio/src/components/panels/exec-approval-* 2>/dev/null)" && test ! -d packages/studio/src/components/onboarding
```

## ❌ marker-written

**Command**: `test -f .converge/studio-state/dropped-domain-components.txt`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/dropped-domain-components.txt
```
