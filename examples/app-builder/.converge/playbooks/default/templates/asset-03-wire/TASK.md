---
title: "Wire — {{assetName}}"
description: Ensure the generated asset is referenced in the app's source and metadata
blocking: true
vars:
  assetId:
  assetName:
  assetType:
  outputPath:
inputs:
  - .stitch/assets/manifest.json
  - "{{outputPath}}"
outputs:
  - src/content/assets.ts
checks:
  - id: assets-ts-exists
    cmd: test -f src/content/assets.ts
    description: asset registry exists
---
# Wire Asset

Update or create `src/content/assets.ts` so `{{assetId}}` and `{{outputPath}}` can be imported by screens and components.

Do not leave the asset orphaned after generation.

