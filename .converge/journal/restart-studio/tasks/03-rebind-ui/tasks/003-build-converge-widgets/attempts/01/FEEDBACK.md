# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **all-four-widgets-exist**
- ❌ **widgets-use-converge-data**

## ❌ all-four-widgets-exist

**Command**: `test -f packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx
```

## ❌ widgets-use-converge-data

**Command**: `grep -ql 'listSessions\|listPlaybooks\|useConvergeEvents\|/api/runs\|/api/playbooks\|/api/events' packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx 2>/dev/null`
**Exit code**: 2
**Output**:
```
Command failed: grep -ql 'listSessions\|listPlaybooks\|useConvergeEvents\|/api/runs\|/api/playbooks\|/api/events' packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx 2>/dev/null
```
