---
id: 001-copy-adapter
title: Copy converge-adapter (8 files) from rescue
outputs:
  - packages/studio/src/lib/converge-adapter
checks:
  - id: adapter-files-present
    description: All 8 converge-adapter files exist
    cmd: "for f in paths playbooks tasks sessions watcher frontmatter schedule index; do test -f packages/studio/src/lib/converge-adapter/$f.ts || exit 1; done"
---

```bash
mkdir -p packages/studio/src/lib/converge-adapter
cp /tmp/converge-studio-rescue/lib/converge-adapter/*.ts packages/studio/src/lib/converge-adapter/
```
