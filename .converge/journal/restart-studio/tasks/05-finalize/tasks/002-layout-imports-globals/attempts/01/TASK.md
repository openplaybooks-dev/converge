# Task: 05-finalize/002-layout-imports-globals

The freshly cloned MC layout already imports globals.css. Verify the import survived the rebind in Phase 03 (sometimes layout edits drop CSS imports — the prior playbook had this exact bug).

```bash
grep -q "import.*globals\.css\|import './globals.css'" packages/studio/src/app/layout.tsx \
  || (echo "FIX: re-add the globals.css import to layout.tsx" && exit 1)
```

If missing, add at the top of `packages/studio/src/app/layout.tsx`:

```tsx
import './globals.css'
```