---
title: "Generate — {{assetName}}"
description: Generate the declared raster asset from its visual specification
blocking: true
vars:
  assetId:
  assetName:
  assetType:
  outputPath:
  specPath:
inputs:
  - "{{specPath}}"
outputs:
  - "{{outputPath}}"
checks:
  - id: output-exists
    cmd: "test -f {{outputPath}}"
    description: output asset exists
---
# Generate Asset

Use the image generation capability to create `{{outputPath}}` from `{{specPath}}`.

Requirements:

- raster image only
- match the theme exactly
- avoid generic stock-photo look
- generate a composition suitable for layering behind UI

