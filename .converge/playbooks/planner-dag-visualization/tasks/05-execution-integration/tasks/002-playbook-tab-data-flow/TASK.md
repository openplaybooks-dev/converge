---
id: 002-playbook-tab-data-flow
title: Wire manifest fetch in PlaybookTab and pass to ExecutionView
inputs:
  - apps/planner/src/components/PlaybookTab.tsx
  - apps/planner/src/components/ExecutionView.tsx
outputs:
  - apps/planner/src/components/PlaybookTab.tsx (modified)
checks:
  - id: playbook-tab-fetches-manifest
    cmd: "grep -q '/manifest' apps/planner/src/components/PlaybookTab.tsx"
    description: PlaybookTab fetches manifest for the selected playbook
  - id: playbook-tab-passes-manifest-to-execution
    cmd: 'awk "/<ExecutionView/,/\/>/" apps/planner/src/components/PlaybookTab.tsx | grep -q "manifest="'
    description: PlaybookTab passes manifest prop to ExecutionView
---

Read `apps/planner/src/components/PlaybookTab.tsx` first. Then modify it:

### 1. Add manifest state
```typescript
const [manifest, setManifest] = useState<any>(null)
```

### 2. Add manifest fetch effect
```typescript
useEffect(() => {
  if (!selectedPlaybook) { setManifest(null); return }
  let cancelled = false
  fetch(`/api/playbooks/${encodeURIComponent(selectedPlaybook)}/manifest`)
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (!cancelled) setManifest(data?.manifest ?? null) })
    .catch(() => { if (!cancelled) setManifest(null) })
  return () => { cancelled = true }
}, [selectedPlaybook])
```

### 3. Pass manifest to ExecutionView

Update the `<ExecutionView>` JSX to include the manifest prop:
```tsx
<ExecutionView
  dag={runDag}
  manifest={manifest}
  onSelectTask={(taskId) => setDrawerTaskId(taskId)}
  selectedTaskId={drawerTaskId}
/>
```

### Implementation notes
- The effect runs in parallel with the existing run list fetch — no dependency change needed
- On playbook change, manifest is cleared (via the effect cleanup + re-run)
- On error, manifest is silently set to null (the DAG view shows empty state)
- Do NOT modify the existing runstate/dag fetching logic
