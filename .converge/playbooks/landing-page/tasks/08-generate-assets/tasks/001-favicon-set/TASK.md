---
id: 001-favicon-set
title: favicon.svg + apple-touch-icon.png + site.webmanifest
inputs:
  - apps/landing/src/icons/converge-mark.svg
  - apps/landing/src/.content/brand.json
outputs:
  - apps/landing/public/favicon.svg
  - apps/landing/public/apple-touch-icon.png
  - apps/landing/public/site.webmanifest
checks:
  - id: favicon-svg-exists
    cmd: "test -f apps/landing/public/favicon.svg"
    description: favicon.svg exists
  - id: apple-touch-icon-exists
    cmd: "test -f apps/landing/public/apple-touch-icon.png"
    description: apple-touch-icon.png exists
  - id: webmanifest-exists
    cmd: "test -f apps/landing/public/site.webmanifest && node -e \"JSON.parse(require('fs').readFileSync('apps/landing/public/site.webmanifest','utf8'))\""
    description: site.webmanifest exists and is valid JSON
  - id: webmanifest-has-name
    cmd: "test -f apps/landing/public/site.webmanifest && node -e \"const m=JSON.parse(require('fs').readFileSync('apps/landing/public/site.webmanifest','utf8'));process.exit(m.name==='Converge'?0:1)\""
    description: webmanifest name is Converge
---

# Favicon set

Three files in `public/`. Cross-browser favicon coverage in 2026 is
mostly: SVG (modern browsers), PNG (Apple touch), webmanifest (Android/PWA).

## Files

### `apps/landing/public/favicon.svg`
Copy `apps/landing/src/icons/converge-mark.svg`. The SVG mark IS the favicon.

### `apps/landing/public/apple-touch-icon.png` (180×180)
Render the converge mark on a solid `#0F1117` (brand bg) background at 180×180.
Use `sharp` (already common in Astro projects) or `librsvg` to convert SVG → PNG.

```bash
# If sharp is available
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('apps/landing/src/icons/converge-mark.svg', 'utf8');
sharp(Buffer.from(svg))
  .resize(180, 180)
  .flatten({ background: '#0F1117' })
  .png()
  .toFile('apps/landing/public/apple-touch-icon.png');
"
```

### `apps/landing/public/site.webmanifest`
```json
{
  "name": "Converge",
  "short_name": "Converge",
  "description": "Define done. Converge gets there.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0F1117",
  "theme_color": "#0F1117",
  "icons": [
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" },
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

## Banned

- Generating .ico files. Modern browsers don't need them; SVG covers it.
- Hardcoding the theme color. Read `brand.palette.bg` from brand.json.
