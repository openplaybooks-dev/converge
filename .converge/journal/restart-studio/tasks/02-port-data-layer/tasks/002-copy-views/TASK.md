---
id: 002-copy-views
title: Copy view-mode primitives from rescue
outputs:
  - packages/studio/src/components/views
checks:
  - id: views-present
    description: All 5 view primitives + index exist
    cmd: "for f in KanbanBoard SessionGantt TableView TaskTree ViewSwitcher; do test -f packages/studio/src/components/views/$f.tsx || exit 1; done && test -f packages/studio/src/components/views/index.ts"
---

```bash
mkdir -p packages/studio/src/components/views
cp /tmp/converge-studio-rescue/components/views/*.tsx packages/studio/src/components/views/
cp /tmp/converge-studio-rescue/components/views/index.ts packages/studio/src/components/views/
```
