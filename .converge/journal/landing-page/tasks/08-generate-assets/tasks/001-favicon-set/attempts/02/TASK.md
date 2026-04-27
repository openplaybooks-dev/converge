# Task: 08-generate-assets/001-favicon-set

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