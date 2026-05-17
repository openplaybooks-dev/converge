---
id: 03-generate-assets
title: Generate Assets
description: Analyze screen needs, generate background and hero assets, and wire them into a manifest for the React app
blocking: true
depends_on:
  - 02-design-system
outputs:
  - .stitch/assets/manifest.json
  - public/generated/**/*.png
checks:
  - id: asset-manifest-exists
    cmd: test -f .stitch/assets/manifest.json
    description: Asset manifest exists
  - id: generated-asset-exists
    cmd: "find public/generated -type f \\( -name '*.png' -o -name '*.jpg' -o -name '*.webp' \\) | head -1 | grep -q ."
    description: At least one generated asset exists
---
# Generate Assets

Discover image needs from the UX and design system, then generate and wire those assets for later screen conversion.

