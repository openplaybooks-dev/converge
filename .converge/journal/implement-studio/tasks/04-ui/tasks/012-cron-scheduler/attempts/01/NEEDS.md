# Needs: 04-ui/012-cron-scheduler

## Expected Outputs

- `packages/converge-studio/src/app/api/playbooks/[name]/schedule`
- `packages/converge-studio/src/components/schedule-form.tsx`
- `packages/converge-studio/src/lib/converge-adapter/schedule.ts`

## Checks

- **schedule-api-exists**: Schedule API route exists (GET + PUT)
- **schedule-form-exists**: ScheduleForm component exists
- **adapter-helper-exists**: schedule helper is in the adapter, not duplicated
- **typecheck-passes**: typecheck-passes
