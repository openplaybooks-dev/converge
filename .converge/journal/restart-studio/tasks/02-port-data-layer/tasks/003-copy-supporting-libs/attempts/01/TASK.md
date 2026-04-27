# Task: 02-port-data-layer/003-copy-supporting-libs

```bash
for f in use-converge-events use-view-mode watcher-singleton schedule-parser \
         run-supervisor ring-buffer session-correlator; do
  cp /tmp/converge-studio-rescue/lib/$f.ts packages/studio/src/lib/$f.ts 2>/dev/null || \
    echo "WARN: /tmp/converge-studio-rescue/lib/$f.ts not in rescue (may be optional)"
done
```

If any are missing from the rescue, they're optional. Phase 06 typecheck will surface any consequence.