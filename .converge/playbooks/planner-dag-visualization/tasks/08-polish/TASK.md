---
id: 08-polish
title: Phase 08 — CSS, theming, edge cases, responsive
blocking: true
inputs:
  - apps/planner/src/app/globals.css
  - apps/planner/src/components/DagFlow.tsx
  - apps/planner/src/components/DagFlowNode.tsx
outputs:
  - apps/planner/src/app/globals.css (modified)
  - apps/planner/src/components/DagFlow.tsx (updated)
  - apps/planner/src/components/DagFlowNode.tsx (updated)
checks:
  - id: xyflow-css-imported
    cmd: "grep -q '@xyflow/react' apps/planner/src/app/globals.css"
    description: globals.css imports @xyflow/react base styles
  - id: xyflow-theme-overrides
    cmd: "grep -qE '(xy-background|xy-node-color|xy-edge-stroke)' apps/planner/src/app/globals.css"
    description: Theme variables for xyflow are overridden
  - id: dag-flow-handles-single-node
    cmd: "grep -qE '(fitView|single)' apps/planner/src/components/DagFlow.tsx"
    description: fitView handles single-node graphs
  - id: dag-flow-node-matches-tree-colors
    cmd: "grep -qE '(emerald|rose|yellow|primary)' apps/planner/src/components/DagFlowNode.tsx"
    description: DagFlowNode uses status color palette
  - id: typecheck-clean
    cmd: "cd apps/planner && npx tsc --noEmit --pretty 2>&1 | head -30"
    description: TypeScript compiles without errors
tags:
  - phase
children:
  - 001-css-theming
  - 002-responsive-edge-cases
  - 003-final-node-styling
---

Polish pass covering CSS, theming, edge cases, and responsive behavior.

## 1. CSS — xyflow base styles

Add to `apps/planner/src/app/globals.css` at the top:
```css
@import '@xyflow/react/dist/style.css';
```

Add theme variable overrides in `@layer base`:
```css
:root {
  --xy-background-color: transparent;
  --xy-node-color: hsl(var(--foreground));
  --xy-node-border: hsl(var(--border));
  --xy-node-boxshadow-hover: 0 4px 12px hsl(var(--primary) / 0.15);
  --xy-edge-stroke: hsl(var(--muted-foreground) / 0.3);
  --xy-edge-stroke-selected: hsl(var(--primary));
  --xy-minimap-background: hsl(var(--surface-1));
  --xy-controls-button-background: hsl(var(--card));
  --xy-controls-button-border: hsl(var(--border));
  --xy-controls-button-color: hsl(var(--foreground));
  --xy-controls-button-color-hover: hsl(var(--foreground));
}

.dark {
  --xy-minimap-background: hsl(var(--surface-1));
  --xy-controls-button-background: hsl(var(--card));
}
```

## 2. Edge cases

- Empty state already handled in DagFlow
- Single node: fitView should center it properly
- Very large graphs: xyflow handles virtualized viewport via pan/zoom — verify with 50+ node manifest
- Missing data: both useDagData and ManifestDagView handle null/empty

## 3. Responsive

- DAG container: `w-full min-h-[400px]` in ExecutionView, `h-[500px]` when in dag mode
- Minimap and Controls scale down on small screens via xyflow defaults
- Node card: `min-w-[200px] max-w-[280px]` prevents overflow

## 4. Theme compatibility

- DagFlowNode uses CSS variables exclusively (no hardcoded colors)
- Minimap and Controls themed to match void design system
- Background dots use muted-foreground at low opacity
- Node border colors reference CSS variables
