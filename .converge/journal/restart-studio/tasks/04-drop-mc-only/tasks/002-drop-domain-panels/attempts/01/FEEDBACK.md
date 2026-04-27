# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **domain-panels-gone**
- ❌ **marker-written**

## ❌ domain-panels-gone

**Command**: `test ! -f packages/studio/src/components/panels/channels-panel.tsx && test ! -f packages/studio/src/components/panels/cron-management-panel.tsx && test ! -f packages/studio/src/components/panels/memory-browser-panel.tsx && test ! -f packages/studio/src/components/panels/multi-gateway-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-config-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-control-panel.tsx && test ! -f packages/studio/src/components/panels/orchestration-bar.tsx && test ! -f packages/studio/src/components/panels/pipeline-tab.tsx && test ! -f packages/studio/src/components/panels/skills-panel.tsx && test ! -f packages/studio/src/components/panels/standup-panel.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test ! -f packages/studio/src/components/panels/channels-panel.tsx && test ! -f packages/studio/src/components/panels/cron-management-panel.tsx && test ! -f packages/studio/src/components/panels/memory-browser-panel.tsx && test ! -f packages/studio/src/components/panels/multi-gateway-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-config-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-control-panel.tsx && test ! -f packages/studio/src/components/panels/orchestration-bar.tsx && test ! -f packages/studio/src/components/panels/pipeline-tab.tsx && test ! -f packages/studio/src/components/panels/skills-panel.tsx && test ! -f packages/studio/src/components/panels/standup-panel.tsx
```

## ❌ marker-written

**Command**: `test -f .converge/studio-state/dropped-domain-panels.txt`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/dropped-domain-panels.txt
```
