# Checks: 04-ui/012-cron-scheduler

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## schedule-api-exists
**Description**: Schedule API route exists (GET + PUT)
**Command**: `test -f 'packages/converge-studio/src/app/api/playbooks/[name]/schedule/route.ts'`

## schedule-form-exists
**Description**: ScheduleForm component exists
**Command**: `test -f packages/converge-studio/src/components/schedule-form.tsx`

## adapter-helper-exists
**Description**: schedule helper is in the adapter, not duplicated
**Command**: `test -f packages/converge-studio/src/lib/converge-adapter/schedule.ts && grep -q 'readSchedule\|writeSchedule' packages/converge-studio/src/lib/converge-adapter/schedule.ts`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`