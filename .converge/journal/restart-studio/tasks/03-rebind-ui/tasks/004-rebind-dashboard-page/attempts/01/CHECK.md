# Checks: 03-rebind-ui/004-rebind-dashboard-page

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## dashboard-imports-converge-widgets
**Description**: dashboard.tsx imports all four converge widgets
**Command**: `grep -q 'recent-runs-widget' packages/studio/src/components/dashboard/dashboard.tsx && grep -q 'playbook-health-widget' packages/studio/src/components/dashboard/dashboard.tsx && grep -q 'live-activity-widget' packages/studio/src/components/dashboard/dashboard.tsx && grep -q 'quick-actions-widget' packages/studio/src/components/dashboard/dashboard.tsx`