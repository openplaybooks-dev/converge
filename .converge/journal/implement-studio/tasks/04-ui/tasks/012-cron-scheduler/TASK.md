---
id: 012-cron-scheduler
title: Schedule playbook runs on a cron expression
outputs:
  - packages/converge-studio/src/app/api/playbooks/[name]/schedule
  - packages/converge-studio/src/components/schedule-form.tsx
  - packages/converge-studio/src/lib/converge-adapter/schedule.ts
checks:
  - id: schedule-api-exists
    description: Schedule API route exists (GET + PUT)
    cmd: "test -f 'packages/converge-studio/src/app/api/playbooks/[name]/schedule/route.ts'"
  - id: schedule-form-exists
    description: ScheduleForm component exists
    cmd: "test -f packages/converge-studio/src/components/schedule-form.tsx"
  - id: adapter-helper-exists
    description: schedule helper is in the adapter, not duplicated
    cmd: "test -f packages/converge-studio/src/lib/converge-adapter/schedule.ts && grep -q 'readSchedule\\|writeSchedule' packages/converge-studio/src/lib/converge-adapter/schedule.ts"
  - id: typecheck-passes
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Mission Control let users schedule agent tasks on cron. The converge analog is "schedule a playbook to run on cron." The schedule lives in the playbook's `playbook.yml` (under a `schedule:` key — verify the existing schema in `packages/core/` before assuming the field name; if it doesn't exist, add it to the core schema first OR persist to a sibling `playbook.schedule.yml` and have the runner read it).

**This task is UI + API + adapter only.** The actual cron loop runs in the converge runner / CLI, not in the studio. The studio just edits the value. (If the runner doesn't yet honor a schedule field, that's a separate task in the `converge` core repo, out of scope here — but document the dependency in the task's prose.)

**Add `src/lib/converge-adapter/schedule.ts`:**
- `readSchedule(playbook): { cron: string | null, timezone?: string, enabled: boolean }`
- `writeSchedule(playbook, schedule): Promise<void>` — updates the playbook YAML in place, preserving the rest of the file (use the existing YAML helpers in `converge-adapter/playbooks.ts`).
- Validate the cron expression with a single small dependency or hand-rolled regex (`croner` is good if a dep is acceptable; otherwise `node-cron`'s validator). If validation fails, throw — the API route returns 400.

**Add `src/app/api/playbooks/[name]/schedule/route.ts`:**
- `GET` returns `{ cron, timezone, enabled }`.
- `PUT` body `{ cron, timezone?, enabled }` validates and writes.

**Add `src/components/schedule-form.tsx`** (client component, ≤ 100 LOC):
- Cron input (text), enabled toggle, optional timezone select.
- A "Next 5 runs" preview rendered client-side from the cron expression (use the same library used for validation; if hand-rolled, skip this preview).
- Save button posts to PUT.

**Wire it in:** add a "Schedule" tab to `src/app/playbooks/[name]/page.tsx` (the playbook detail) that mounts `<ScheduleForm playbook={name} initial={...} />`. The initial value comes from the server component fetching `GET /api/playbooks/[name]/schedule`.

**Verification:**
- Set a cron of `*/5 * * * *` on the `implement-studio` playbook via the UI. Reload the page — value persists.
- Inspect `.converge/playbooks/implement-studio/playbook.yml` — the schedule field is present.
- Set an invalid cron (`not a cron`) — the form shows an error, no write happens.

**Out of scope:** the runner side of "actually run it on schedule." If the converge runner doesn't yet honor schedules, the UI still saves the field; the runner integration is tracked separately.
