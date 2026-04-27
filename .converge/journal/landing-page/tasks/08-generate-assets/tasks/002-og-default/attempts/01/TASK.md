# Task: 08-generate-assets/002-og-default

# Default OG image

The site-wide fallback Open Graph image. 1200×630 is the standard size
shared by Facebook, LinkedIn, Twitter/X large card.

## Composition

- Background: solid `brand.palette.bg` (`#0F1117`)
- Centered: converge-mark logo at ~120px high
- Below logo: tagline `Define done. Converge gets there.` in Inter Bold ~64pt, white
- Subtle indigo glow at lower-left corner (decorative)

## Process

Use `astro-og-canvas` (already installed for blog posts in 07-integrate-blog/005-og-images) — it can also generate static OG images.

Or use `sharp` + an SVG composite:

```bash
node << 'EOF'
const sharp = require('sharp');
const fs = require('fs');

const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0F1117" />
  <radialGradient id="glow" cx="0.2" cy="0.8" r="0.5">
    <stop offset="0%" stop-color="#6366F1" stop-opacity="0.15" />
    <stop offset="100%" stop-color="#6366F1" stop-opacity="0" />
  </radialGradient>
  <rect width="1200" height="630" fill="url(#glow)" />
  <text x="600" y="320" font-family="Inter, system-ui" font-size="64" font-weight="700" fill="#F8FAFC" text-anchor="middle">
    Define done.
  </text>
  <text x="600" y="400" font-family="Inter, system-ui" font-size="64" font-weight="700" fill="#6366F1" text-anchor="middle">
    Converge gets there.
  </text>
</svg>
`;
sharp(Buffer.from(svg)).png().toFile('apps/landing/public/og/default.png');
EOF
```

(Adjust the path if `mkdir -p apps/landing/public/og` is needed first.)

## Banned

- Putting the URL or domain on the OG image. The image is a hero card; the URL is part of the share metadata.
- A photo or illustration that has nothing to do with the tagline. The brand voice is technical and direct.