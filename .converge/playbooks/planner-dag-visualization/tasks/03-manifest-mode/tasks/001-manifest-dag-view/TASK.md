---
id: 001-manifest-dag-view
title: Create ManifestDagView for plan-review DAG
inputs:
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/lib/use-dag-data.ts
outputs:
  - apps/planner/src/components/ManifestDagView.tsx
checks:
  - id: manifest-dag-view-exists
    cmd: "test -f apps/planner/src/components/ManifestDagView.tsx"
    description: ManifestDagView.tsx exists
  - id: manifest-dag-view-fetches-manifest
    cmd: "grep -qE '(fetch|manifest|/api/playbooks)' apps/planner/src/components/ManifestDagView.tsx"
    description: Fetches manifest from API
  - id: manifest-dag-view-uses-dag-data
    cmd: "grep -q 'useDagData' apps/planner/src/components/ManifestDagView.tsx"
    description: Uses useDagData hook
  - id: manifest-dag-view-uses-dag-flow
    cmd: "grep -q 'DagFlow' apps/planner/src/components/ManifestDagView.tsx"
    description: Renders DagFlow
---

Create `apps/planner/src/components/ManifestDagView.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DagFlow } from './DagFlow'
import { useDagData } from '@/lib/use-dag-data'

interface ManifestDagViewProps {
  playbookName: string | null
  onSelectTask?: (taskId: string) => void
  selectedTaskId?: string | null
}

export function ManifestDagView({ playbookName, onSelectTask, selectedTaskId }: ManifestDagViewProps) {
  const [manifest, setManifest] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!playbookName) { setManifest(null); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/playbooks/${encodeURIComponent(playbookName)}/manifest`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled) setManifest(data?.manifest ?? null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [playbookName])

  const { nodes, edges } = useDagData({ manifest, runstate: null })

  if (!playbookName) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center text-xs text-muted-foreground">
        Select a playbook to view its task DAG.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading task graph…
      </div>
    )
  }

  if (!manifest || nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/30 p-8 text-center text-xs text-muted-foreground">
        No compiled manifest. Run compile to generate the task graph.
      </div>
    )
  }

  return (
    <DagFlow
      nodes={nodes}
      edges={edges}
      onNodeClick={onSelectTask}
      selectedNodeId={selectedTaskId}
      isLive={false}
    />
  )
}
```

Implementation notes:
1. Fetch from `/api/playbooks/<name>/manifest` — the existing API route
2. Handle cancellation with a `cancelled` flag in the effect cleanup
3. Three empty/loading states: no playbook selected, loading, no manifest
4. Pass `isLive={false}` since this is static plan review, not execution
