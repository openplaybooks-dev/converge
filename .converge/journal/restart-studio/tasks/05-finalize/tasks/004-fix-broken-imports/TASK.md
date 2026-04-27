---
id: 004-fix-broken-imports
title: Run typecheck and fix any dangling MC imports
outputs:
  - .converge/studio-state/typecheck-fix.json
checks:
  - id: typecheck-passes
    description: Studio typecheck has zero errors
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: fix-report-written
    description: Typecheck-fix report exists
    cmd: "test -f .converge/studio-state/typecheck-fix.json"
---

Phase 04's deletes will have left some dangling imports — files that reference modules we just deleted. Run typecheck and fix each:

```bash
pnpm --filter @converge/studio typecheck 2>&1 | tee /tmp/studio-typecheck.log
COUNT=$(grep -c 'error TS' /tmp/studio-typecheck.log)
```

For each `Cannot find module '@/lib/<X>'` error:
- If the importer is itself MC-domain (a deleted-and-then-undeleted file) → delete the importer too
- If the importer is converge-native (one of our rebound components) → strip the bad import; replace with an inline value or comment if needed

After all fixes, typecheck must return 0 errors.

Write a report at `.converge/studio-state/typecheck-fix.json`:
```json
{
  "timestamp": "<ISO>",
  "initialErrorCount": <int>,
  "finalErrorCount": 0,
  "filesEdited": [<list>],
  "filesDeleted": [<list>]
}
```

This task can iterate (each AI attempt fixes a batch of errors); accept multi-attempt convergence.
