---
id: 002-integrate-into-plan-view
title: Wire ManifestDagView into PlaybookPlanContract
inputs:
  - apps/planner/src/components/ManifestDagView.tsx
  - apps/planner/src/components/plan/PlaybookPlanContract.tsx
outputs:
  - apps/planner/src/components/plan/PlaybookPlanContract.tsx
checks:
  - id: manifest-dag-imported-in-plan
    cmd: "grep -q 'ManifestDagView' apps/planner/src/components/plan/PlaybookPlanContract.tsx"
    description: PlaybookPlanContract imports ManifestDagView
---

Integrate the manifest DAG into the existing plan view.

Read `apps/planner/src/components/plan/PlaybookPlanContract.tsx` first to understand its current structure. Then add:

1. Import `ManifestDagView` and `Workflow` icon from lucide-react
2. Add `const [dagView, setDagView] = useState(false)` state
3. Add a small toggle button in the header area next to the playbook name:
   ```tsx
   <button
     onClick={() => setDagView(v => !v)}
     className="p-1.5 rounded-md hover:bg-muted/60 transition-colors"
     title={dagView ? 'Show plan contract' : 'Show DAG'}
   >
     <Workflow className="w-4 h-4" />
   </button>
   ```
4. When `dagView` is true, render `<ManifestDagView playbookName={playbookName} />` instead of the existing contract editor (PlanContract/TaskTreeEditor/etc.)
5. When `dagView` is false, render the existing contract view as before

Match existing styling: the toggle should be subtle, matching the muted/ghost button style used elsewhere in the app. Do not change the existing plan contract rendering logic.
