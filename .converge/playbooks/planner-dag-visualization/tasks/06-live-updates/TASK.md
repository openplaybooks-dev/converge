---
id: 06-live-updates
title: Phase 06 — Wire SSE live updates to DAG node statuses
blocking: true
inputs:
  - apps/planner/src/lib/use-journal-stream.ts
  - apps/planner/src/store/index.ts
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/lib/use-dag-data.ts
outputs:
  - apps/planner/src/lib/use-dag-data.ts (modified — subscribes to Zustand runState)
  - apps/planner/src/components/DagFlow.tsx (verified — live mode)
checks:
  - id: use-dag-data-subscribes-to-store
    cmd: "grep -q 'useMissionControl' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData subscribes to the Zustand store
  - id: use-dag-data-passes-runstate
    cmd: "grep -q 'runState' apps/planner/src/lib/use-dag-data.ts"
    description: useDagData references runState from store
  - id: dag-flow-animates-live
    cmd: "grep -qE '(animated|isLive)' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow supports animated edges in live mode
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
tags:
  - phase
children:
  - 001-store-subscription
  - 002-live-animation
---

Wire the SSE stream so that when task statuses update via `useJournalStream`,
the DAG nodes re-render with updated status colors.

## How it works

1. The existing `useJournalStream` hook updates `runState` in the Zustand store (keyed by task ID) whenever SSE events arrive
2. In `useDagData`, subscribe to the Zustand store's `runState` using `useMissionControl(s => s.runState)`
3. When computing layout, overlay store-provided statuses onto nodes AFTER the runstate merge
4. Store-based statuses are supplementary — they don't replace manifest or runstate, they add real-time updates for in-progress tasks
5. DagFlow already accepts `isLive` prop — verify animated edges work

## Implementation (in useDagData)

Add inside the hook:
```typescript
const storeRunState = useMissionControl(s => s.runState)
```

Inside the useMemo, after computing layout:
```typescript
// Overlay real-time statuses from SSE-based store updates
if (storeRunState && Object.keys(storeRunState).length > 0) {
  for (const node of layout.nodes) {
    const entry = storeRunState[node.id]
    if (entry && entry.status) {
      const validStatuses = ['pending', 'running', 'pass', 'error', 'skipped']
      if (validStatuses.includes(entry.status)) {
        node.data = { ...node.data, runStatus: entry.status }
      }
    }
  }
}
```

## Live animation in DagFlow

DagFlow already sets `defaultEdgeOptions.animated = isLive`. Verify:
- When `isLive` is true, edges show animated dashed flow
- When `isLive` is false, edges are static
