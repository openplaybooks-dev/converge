# Task: 02-port-data-layer/004-copy-api-routes

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