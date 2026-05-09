---
id: 001-store-subscription
title: Subscribe to Zustand runState in useDagData for live updates
inputs:
  - apps/planner/src/lib/use-dag-data.ts
  - apps/planner/src/store/index.ts
outputs:
  - apps/planner/src/lib/use-dag-data.ts (modified)
checks:
  - id: use-dag-data-subscribes-to-store
    cmd: "grep -q 'useMissionControl' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData subscribes to Zustand store
  - id: use-dag-data-passes-runstate
    cmd: "grep -q 'runState' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData references runState from store
---

Read `apps/planner/src/store/index.ts` to verify the store shape and selector name (likely `useMissionControl`). Then modify `use-dag-data.ts`:

### 1. Import the store hook
```typescript
import { useMissionControl } from '@/store'
```

### 2. Subscribe to runState
Add at the top of the `useDagData` function body (before `useMemo`):
```typescript
const storeRunState = useMissionControl(s => s.runState)
```

### 3. Overlay store statuses after layout computation
Inside the `useMemo`, after computing `result` from `computeDagLayout`, add:
```typescript
// Overlay real-time statuses from SSE-based store updates
// (store runState is keyed by task ID with { status, attempts, duration_ms, ... })
if (storeRunState && Object.keys(storeRunState).length > 0) {
  for (const node of result.nodes) {
    const entry = storeRunState[node.id]
    if (entry?.status) {
      const validStatuses = ['pending', 'running', 'pass', 'error', 'skipped']
      if (validStatuses.includes(entry.status)) {
        node.data = { ...node.data, runStatus: entry.status }
      }
    }
  }
}
```

### 4. Add `storeRunState` to the useMemo dependency array
Add `storeRunState` to the deps array so the memo recomputes when SSE events update the store.

### Important
- `useMissionControl` must be called at the top level of the hook (not inside useMemo)
- The store's `runState` entries are keyed by task ID with `{ status, attempts, duration_ms, ... }`
- Store statuses supplement, not replace, runstate statuses — they provide real-time in-progress updates
