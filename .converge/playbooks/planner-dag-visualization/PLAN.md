# PLAN.md — planner-dag-visualization

## Goal

Add an interactive DAG visualization of tasks to the Converge Planner web app
(`apps/planner`). The existing `lib/dag-layout.ts` computes a dagre layout from
manifest data but is not wired into any component. Create a React Flow component
that renders the task graph, handle both manifest-only (plan review) and
manifest+runstate (execution monitoring) modes, integrate with the existing
ExecutionView, and support live SSE updates.

## Decision

CONTAINER. The work decomposes into 8 sequential phases plus a verification
phase. Later phases depend on outputs from earlier ones but there is no
parallel fan-out at the root — each phase produces a qualitatively different
artifact.

## Pattern

**Process Pipeline.** Each phase transforms the planner codebase toward the
goal. The phases are ordered by dependency: the DAG component must exist before
the data hook, the hook must exist before manifest mode works, manifest mode
must work before runstate merging, merging must work before execution view
integration, etc.

## Phase breakdown

### Phase 01: dag-component
Create `DagFlow.tsx` (the React Flow wrapper) and `DagFlowNode.tsx` (custom
node renderer). DagFlow wraps `<ReactFlow>` with dagre-computed layout, a
minimap, and controls. DagFlowNode is a custom node type that shows task ID,
dag_type badge, and status dot. This phase produces the pure visual
component that accepts `nodes` and `edges` props.

### Phase 02: dag-data-hook
Create `use-dag-data.ts` that calls `computeDagLayout()` from dag-layout.ts,
accepting either a manifest or a runstate DAG and returning the
`@xyflow/react` Node[] and Edge[]. This is the bridge between raw data and
the React Flow renderer.

### Phase 03: manifest-mode
Handle the "plan review" case: fetch manifest from the API, compute the DAG
layout from manifest nodes/parent_map/child_map, and render the static task
graph with no runstate overlay. Nodes show state color (concrete/expected/
frontier) but no run status.

### Phase 04: runstate-merger
Extend the data hook to overlay runstate status onto manifest nodes. Each
node in the merged output gets a `runStatus` field color-coded by status.
Nodes present in runstate but not manifest (diverge/converge synthetic nodes)
are added dynamically. Edges from runstate supplement manifest edges.

### Phase 05: execution-integration
Modify ExecutionView.tsx to offer a view toggle between the existing tree
view and the new DAG view. Wire the data flow: PlaybookTab fetches manifest +
runstate, passes to ExecutionView, which passes to either RunStateTree or
DagFlow depending on view mode.

### Phase 06: live-updates
Wire useJournalStream / Zustand store state into DagFlow so that when SSE
events update runState in the store, the DAG nodes re-render with updated
status colors. The DAG should animate node state transitions.

### Phase 07: node-interaction
Handle node click in DagFlow: open the existing TaskRunDrawer with the
selected task's detail. Integrate with PlaybookTab's drawer state management
so clicking a DAG node is equivalent to clicking a tree leaf.

### Phase 08: polish
CSS refinements: xyflow base styles in globals.css, responsive sizing,
dark/light theme compatibility, minimap styling, edge labels, node sizing
tuning. Handle edge cases: empty graph, single-node graph, very large
graphs (virtualization via xyflow viewport).

### Phase 09: verify
TypeScript compilation check, production build check, manual or automated
verification that all integration points work.

## Children

| id | kind | goal | gating output |
|---|---|---|---|
| `01-dag-component` | container | DagFlow.tsx + DagFlowNode.tsx render a graph | Components exist and typecheck |
| `02-dag-data-hook` | container | useDagData wraps computeDagLayout | Hook exists and typechecks |
| `03-manifest-mode` | container | DAG renders from manifest API data | Manifest-fetched graph renders |
| `04-runstate-merger` | container | Runstate status overlays onto DAG nodes | Merged nodes show status colors |
| `05-execution-integration` | container | ExecutionView has DAG/tree toggle | Toggle switches views; both render |
| `06-live-updates` | container | SSE events update DAG node statuses | Status transitions reflect in DAG |
| `07-node-interaction` | container | Node click opens TaskRunDrawer | Drawer opens on DAG node click |
| `08-polish` | container | CSS, edge cases, responsive, theme | Builds clean, all themes work |
| `09-verify` | container | Build + typecheck pass | `pnpm build` succeeds |

## Pointers

- dag-layout.ts: `apps/planner/src/lib/dag-layout.ts`
- RunStateTree.tsx: `apps/planner/src/components/RunStateTree.tsx`
- ExecutionView.tsx: `apps/planner/src/components/ExecutionView.tsx`
- PlaybookTab.tsx: `apps/planner/src/components/PlaybookTab.tsx`
- TaskRunDrawer.tsx: `apps/planner/src/components/TaskRunDrawer.tsx`
- Store: `apps/planner/src/store/index.ts`
- useJournalStream: `apps/planner/src/lib/use-journal-stream.ts`
- API routes:
  - Manifest: `apps/planner/src/app/api/playbooks/[name]/manifest/route.ts`
  - Run state: `apps/planner/src/app/api/playbooks/[name]/runs/[runId]/route.ts`
- CSS base: `apps/planner/src/app/globals.css`
- Dependencies: `@xyflow/react` ^12.10.0, `dagre` ^0.8.5 (already in package.json)
