# Checks: 03-rebind-ui/003-build-converge-widgets

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## all-four-widgets-exist
**Description**: All four converge widgets exist
**Command**: `test -f packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx && test -f packages/studio/src/components/dashboard/widgets/quick-actions-widget.tsx`

## widgets-use-converge-data
**Description**: Widgets reference converge data hooks or APIs
**Command**: `grep -ql 'listSessions\|listPlaybooks\|useConvergeEvents\|/api/runs\|/api/playbooks\|/api/events' packages/studio/src/components/dashboard/widgets/recent-runs-widget.tsx packages/studio/src/components/dashboard/widgets/playbook-health-widget.tsx packages/studio/src/components/dashboard/widgets/live-activity-widget.tsx 2>/dev/null`