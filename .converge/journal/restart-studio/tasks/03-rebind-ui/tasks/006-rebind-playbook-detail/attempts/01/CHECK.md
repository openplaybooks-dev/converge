# Checks: 03-rebind-ui/006-rebind-playbook-detail

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## detail-page-exists
**Description**: /playbooks/[name]/page.tsx exists
**Command**: `test -f 'packages/studio/src/app/playbooks/[name]/page.tsx'`

## detail-tabs-component-exists
**Description**: playbook-detail-tabs.tsx exists with 4 tabs
**Command**: `test -f packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Overview' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Tasks' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Runs' packages/studio/src/components/playbook-detail-tabs.tsx && grep -q 'Config' packages/studio/src/components/playbook-detail-tabs.tsx`