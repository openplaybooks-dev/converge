---
title: "Generate — {{assetType}}: {{assetName}}"
description: Generate the actual asset file based on the specification
blocking: true
tags:
  - asset
  - generate
  - "{{assetType}}"
vars:
  assetId:
  assetType:
  assetName:
  format:
  dimensionWidth:
  dimensionHeight:
  outputPath:
  generateGuidelines:
  specPath:
inputs:
  - "{{specPath}}"
  - .stitch/system/DESIGN.md
outputs:
  - "{{outputPath}}"
checks:
  - id: asset-exists
    cmd: "test -f {{outputPath}}"
    description: Asset file was generated
  - id: asset-size-reasonable
    cmd: "stat -f%z {{outputPath}} 2>/dev/null | awk '{if ($1 > 100 && $1 < 500000) exit 0; exit 1}'"
    description: Asset file size is reasonable (not empty, not huge)
---

# Generate Asset

Generate the actual asset file based on the specification.

## Prerequisites

Read `SPEC.md` at `{{specPath}}` for detailed visual requirements.

## Asset Info

- **ID:** {{assetId}}
- **Type:** {{assetType}}
- **Format:** {{format}}
- **Dimensions:** {{dimensionWidth}}x{{dimensionHeight}}
- **Output:** {{outputPath}}

## Generation Guidelines

{{generateGuidelines}}

## Output

Create the asset file at `{{outputPath}}`.

### Requirements

- Valid file format (SVG 1.1/2.0 for vector, PNG for raster)
- No external dependencies (no linked images, no remote fonts)
- Optimized for file size
- Match the dimensions specified in the spec
- Follow all color and style guidelines from SPEC.md
