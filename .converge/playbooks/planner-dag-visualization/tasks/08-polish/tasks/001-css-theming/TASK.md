---
id: 001-css-theming
title: xyflow CSS imports and theme overrides
inputs:
  - apps/planner/src/app/globals.css
outputs:
  - apps/planner/src/app/globals.css (modified)
checks:
  - id: xyflow-css-imported
    cmd: "grep -q '@xyflow/react' apps/planner/src/app/globals.css"
    description: globals.css imports @xyflow/react base styles
  - id: xyflow-theme-overrides-present
    cmd: "grep -qE '(xy-background-color|xy-node-color|xy-edge-stroke)' apps/planner/src/app/globals.css"
    description: Theme variables for xyflow are overridden
---

Read `apps/planner/src/app/globals.css` first. Note its structure: Tailwind directives at top, then `@layer base` with CSS variable definitions, then utility layers.

### 1. Add @import

At the very top of the file, before `@tailwind base`:
```css
@import '@xyflow/react/dist/style.css';
```

### 2. Add xyflow CSS variable overrides

In the `:root` block (inside `@layer base`), add:
```css
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
--xy-selection-background-color: hsl(var(--primary) / 0.08);
--xy-selection-border: hsl(var(--primary) / 0.3);
```

In the `.dark` block, override any variables that need different dark values:
```css
.dark {
  --xy-minimap-background: hsl(var(--surface-1));
  --xy-controls-button-background: hsl(var(--card));
  --xy-node-boxshadow-hover: 0 4px 12px hsl(var(--primary) / 0.25);
}
```

### 3. Minimap additional styling

Add a custom class override for the minimap:
```css
.react-flow__minimap {
  border-radius: var(--radius-lg);
  border: 1px solid hsl(var(--border) / 0.6);
  overflow: hidden;
}
```

### Important
- Use existing CSS variables (`--surface-1`, `--card`, `--border`, `--primary`, etc.) — do NOT create new ones
- Match the existing `.dark` selector pattern (it may be a class or a media query — follow what's there)
- The import must be at the TOP of the file, before Tailwind
