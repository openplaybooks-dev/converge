---
id: 004-copy-api-routes
title: Copy converge-native API routes from rescue
outputs:
  - packages/studio/src/app/api/playbooks
  - packages/studio/src/app/api/runs
  - packages/studio/src/app/api/run
  - packages/studio/src/app/api/watch
  - packages/studio/src/app/api/events
  - packages/studio/src/app/api/search
  - packages/studio/src/app/api/settings
checks:
  - id: api-routes-all-copied
    description: All 7 converge-native API route trees exist
    cmd: "for d in playbooks runs run watch events search settings; do test -d packages/studio/src/app/api/$d || exit 1; done"
---

```bash
mkdir -p packages/studio/src/app/api
for d in playbooks runs run watch events search settings; do
  cp -R /tmp/converge-studio-rescue/api/$d packages/studio/src/app/api/
done
```

After this leaf, the new package has:
- MC's polished UI components (from clone)
- The converge-native data layer (from rescue)
- The converge-native API routes (from rescue)

Phase 03 ties the UI to the data.
