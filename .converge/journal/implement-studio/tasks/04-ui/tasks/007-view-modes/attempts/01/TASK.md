# Task: 04-ui/007-view-modes

Build a small set of generic view-mode primitives that the playbook detail page, runs list, and live session view all reuse. This keeps the look-and-feel consistent across surfaces and avoids three independent kanban/tree/gantt implementations.

**Design**: every consumer page picks the modes it supports and wires its own data adapter. The primitives are presentation-only; data comes from props.

---

### `lib/use-view-mode.ts`

```ts
'use client';
import { useEffect, useState } from 'react';

export type ViewMode = 'table' | 'kanban' | 'tree' | 'gantt';

export function useViewMode(key: string, defaultMode: ViewMode, allowed: ViewMode[]) {
  const storageKey = `studio.view.${key}`;
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as ViewMode | null;
    if (saved && allowed.includes(saved)) setMode(saved);
  }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, mode); }, [storageKey, mode]);
  return [mode, setMode] as const;
}
```

Persists the user's choice per surface (so the runs page and the playbook detail can remember different defaults).

---

### `components/views/ViewSwitcher.tsx`

Segmented control. Renders only the modes the page lists in `allowed`.

```tsx
interface Props {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  allowed: ViewMode[];
}
```

Use Mission Control's existing button/segmented-control primitive (shadcn/Radix) — do not roll a fresh one. Icon per mode: table grid, kanban columns, tree branches, gantt bars.

---

### `components/views/TableView.tsx`

Generic data table. Already present in upstream Mission Control — wrap it with a stable column-spec API so consumers pass `{ columns, rows, onRowClick }`.

---

### `components/views/KanbanBoard.tsx`

Status-grouped column board.

```tsx
interface KanbanItem {
  id: string;
  title: string;
  status: string;          // group key
  subtitle?: string;
  href?: string;           // click navigates here
  meta?: React.ReactNode;  // small badges (duration, count, etc.)
}

interface Props {
  items: KanbanItem[];
  columns: Array<{ key: string; label: string; color?: string }>;  // explicit column order
  onItemClick?: (item: KanbanItem) => void;
}
```

- Drag-and-drop is **out of scope** for MVP — kanban is a read-only grouped view here. Status changes happen through file edits / runs, not drags.
- Empty columns render a muted placeholder, not vanish.
- Virtualize columns with >50 items.

---

### `components/views/TaskTree.tsx`

Hierarchical view of tasks (or any parent/child structure).

```tsx
interface TreeNode {
  id: string;
  title: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
  href?: string;
  children?: TreeNode[];
  meta?: React.ReactNode;
}

interface Props {
  nodes: TreeNode[];
  defaultExpandedDepth?: number;       // default 1
  onNodeClick?: (node: TreeNode) => void;
}
```

- Collapse/expand state persisted in localStorage keyed by node id.
- Status icon at left (matches the icons converge CLI uses: `○` pending, `▶` running, `✅` completed, `❌` failed). Reuse a status-icon component if one is added; otherwise inline.
- Indent guides (vertical lines) for readability on deep trees.

---

### `components/views/SessionGantt.tsx`

Timeline of task attempts within a single session.

```tsx
interface GanttRow {
  taskPath: string;             // y-axis label
  attempts: Array<{
    startedAt: string;          // ISO
    endedAt?: string;           // ISO; if missing, treated as ongoing
    status: 'running' | 'completed' | 'failed';
    label?: string;             // tooltip extra
  }>;
}

interface Props {
  rows: GanttRow[];
  sessionStartedAt: string;
  sessionEndedAt?: string;       // omit for live sessions; auto-extends "now"
  onAttemptClick?: (taskPath: string, attemptIndex: number) => void;
}
```

- Time axis at top: ticks at 1m / 5m / 1h granularity depending on session duration.
- Bar color by status (green/red/blue for completed/failed/running).
- Live session: a thin vertical "now" line that updates every second; ongoing bars extend to it.
- For sessions with >100 rows, virtualize the y-axis.
- If a Mission Control gantt component already exists in the upstream, **wrap** it rather than rebuild — adapt the props, document the wrap.

---

### Consumer integration

Tasks 002-playbooks-list-detail, 005-runs-list, and 006-live-session-view import from `@/components/views/*` and `@/lib/use-view-mode` to provide their view options:

| Surface | Modes allowed | Default |
|---|---|---|
| Playbook detail (tasks panel) | `table`, `kanban`, `tree` | `tree` |
| Runs list | `table`, `kanban` | `table` |
| Live session view | `gantt`, `tree`, `table` (events) | `gantt` |

Each consumer maps its domain data into the primitive's input shape — no business logic in the view components.

---

**Reuse**: prefer Mission Control's existing UI primitives (table, drag handles, popover) under the hood. The new components are about a unified API and behavior, not new visual primitives.

**Out of scope for MVP**: drag-to-reorder kanban, gantt zoom-and-pan, tree filtering by status. Note these as TODOs in code comments where the seam exists.