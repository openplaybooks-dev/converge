---
id: 003-copy-supporting-libs
title: Copy supporting libs (use-converge-events, run-supervisor, etc.) from rescue
outputs:
  - packages/studio/src/lib/use-converge-events.ts
  - packages/studio/src/lib/run-supervisor.ts
checks:
  - id: supporting-libs-present
    description: Required supporting libs exist
    cmd: "for f in use-converge-events run-supervisor; do test -f packages/studio/src/lib/$f.ts || exit 1; done"
---

```bash
for f in use-converge-events use-view-mode watcher-singleton schedule-parser \
         run-supervisor ring-buffer session-correlator; do
  cp /tmp/converge-studio-rescue/lib/$f.ts packages/studio/src/lib/$f.ts 2>/dev/null || \
    echo "WARN: /tmp/converge-studio-rescue/lib/$f.ts not in rescue (may be optional)"
done
```

If any are missing from the rescue, they're optional. Phase 06 typecheck will surface any consequence.
