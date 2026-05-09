---
id: 003-final-node-styling
title: Final DagFlowNode styling to match RunStateTree visual language
inputs:
  - apps/planner/src/components/DagFlowNode.tsx
  - apps/planner/src/components/RunStateTree.tsx
outputs:
  - apps/planner/src/components/DagFlowNode.tsx
checks:
  - id: node-uses-same-status-colors
    cmd: "grep -qE '(bg-emerald|bg-rose|bg-yellow)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode uses same status color palette
  - id: node-uses-css-variables
    cmd: "grep -qE '(var\\(--|hsl\\(var)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode uses CSS variables for theme compatibility
  - id: node-has-status-dot
    cmd: "grep -qE '(rounded-full|STATUS_DOT)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode has status dot indicator
  - id: node-has-dag-type-badge
    cmd: "grep -q 'dag_type' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode shows diverge/converge badge
---

Read both `apps/planner/src/components/DagFlowNode.tsx` and
`apps/planner/src/components/RunStateTree.tsx`. Ensure DagFlowNode's visual
language matches the tree view.

### Status colors (must match RunStateTree.tsx exactly)

```typescript
const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-foreground/30',
  running: 'bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18)]',
  pass: 'bg-emerald-500',
  error: 'bg-rose-500',
  skipped: 'bg-yellow-500/70',
}

const STATUS_BORDER: Record<string, string> = {
  pending: 'border-border/60',
  running: 'border-primary/40 shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.45)]',
  pass: 'border-emerald-500/30',
  error: 'border-rose-500/40',
  skipped: 'border-yellow-500/30',
}
```

Compare against RunStateTree.tsx lines 47-69 and ensure 100% match.

### Node card
- Use same card classes: `rounded-xl border bg-card/80 backdrop-blur-sm`
- Status dot: `absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full ring-2 ring-background`
- Running pulse: `animate-pulse` on the dot when status is 'running'
- Selected ring: `ring-2 ring-primary/50`
- Left accent: `border-l-[3px]` for diverge (cyan-500) and converge (violet-500)

### Style check
- All colors use CSS variables (`var(--...)` or `hsl(var(--...))`)
- No hardcoded hex values for theme-dependent colors
- Dark mode: all `bg-*` and `border-*` Tailwind classes work in both modes
