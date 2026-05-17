---
title: "Spec — {{assetName}}"
description: Write the visual specification for a generated image asset
blocking: true
vars:
  assetId:
  assetName:
  assetType:
  outputPath:
  width:
  height:
  screenIds:
  specPath:
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/assets/manifest.json
outputs:
  - "{{specPath}}"
checks:
  - id: spec-exists
    cmd: "test -f {{specPath}}"
    description: spec exists
---
# Create Asset Spec

Write `{{specPath}}`.

The spec must describe:

- composition and mood
- subject matter or texture intent
- exact palette references from `DESIGN.md`
- how the asset supports screens: {{screenIds}}
- output size: {{width}}x{{height}}

Be detailed enough that the image generator can create the asset from the spec alone.

