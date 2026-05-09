---
id: 002-live-animation
title: Animate edges and nodes in live mode
inputs:
  - apps/planner/src/components/DagFlow.tsx
checks:
  - id: dag-flow-animates-live
    cmd: "grep -qE '(animated|isLive)' apps/planner/src/components/DagFlow.tsx"
    description: DagFlow supports animated edges in live mode
---

Verify DagFlow already handles live animation correctly. The Phase 01 implementation should include:

1. **Animated edges when `isLive` is true:**
```typescript
const edgeOptions = isLive
  ? { ...defaultEdgeOptions, animated: true }
  : defaultEdgeOptions
```

2. **The `defaultEdgeOptions` with smoothstep type:**
```typescript
const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  style: { stroke: 'hsl(var(--muted-foreground) / 0.4)', strokeWidth: 1.5 },
}
```

If these aren't present, add them. The animated edges create a flowing dash pattern that visually indicates the DAG is "live."

Additionally, verify the DagFlowNode's running state pulse animation works:
- When `runStatus === 'running'`, the status dot gets `animate-pulse` class
- The border gets a subtle glow via `shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.45)]`
