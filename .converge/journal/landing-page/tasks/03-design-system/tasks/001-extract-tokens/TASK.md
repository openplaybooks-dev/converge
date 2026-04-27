---
id: 001-extract-tokens
title: Extract design tokens from brand.json into tokens.json + tokens.css
inputs:
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/src/styles/tokens.json
  - apps/landing/src/styles/tokens.css
checks:
  - id: tokens-json-exists
    cmd: "test -f apps/landing/src/styles/tokens.json && node -e \"JSON.parse(require('fs').readFileSync('apps/landing/src/styles/tokens.json','utf8'))\""
    description: tokens.json exists and is valid JSON
  - id: tokens-css-exists
    cmd: "test -f apps/landing/src/styles/tokens.css"
    description: tokens.css exists
  - id: palette-keys
    cmd: "test -f apps/landing/src/styles/tokens.json && node -e \"const t=require('./apps/landing/src/styles/tokens.json');const ok=t.color&&['bg','indigo','text','accent'].every(k=>t.color[k]);process.exit(ok?0:1)\""
    description: tokens.json has at least bg/indigo/text/accent colors
  - id: tokens-css-has-variables
    cmd: "test -f apps/landing/src/styles/tokens.css && grep -qE -- '--color-(bg|indigo|text)' apps/landing/src/styles/tokens.css"
    description: tokens.css defines at least 3 color custom properties
  - id: globals-imports-tokens
    cmd: "test -f apps/landing/src/styles/globals.css && grep -qE \"@import.*tokens\\.css|@import.*['\\\"]\\./tokens\" apps/landing/src/styles/globals.css"
    description: globals.css imports tokens.css
---

# Extract tokens

Generate two files from `brand.json`:

### `apps/landing/src/styles/tokens.json` (machine-readable)

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "bg":         "#0F1117",
    "bgElev":     "#1E293B",
    "indigo":     "#6366F1",
    "cyan":       "#22D3EE",
    "violet":     "#A78BFA",
    "text":       "#F8FAFC",
    "textMuted":  "#94A3B8",
    "textDim":    "#64748B",
    "accent":     "#EF4444",
    "border":     "#1E293B"
  },
  "spacing": {
    "1": "0.25rem",  "2": "0.5rem",  "3": "0.75rem", "4": "1rem",
    "6": "1.5rem",   "8": "2rem",    "10": "2.5rem", "12": "3rem",
    "16": "4rem",    "20": "5rem",   "24": "6rem",   "32": "8rem"
  },
  "radius": { "sm": "0.25rem", "md": "0.5rem", "lg": "0.75rem", "xl": "1rem", "2xl": "1.5rem" },
  "type": {
    "scale": {
      "xs": "0.75rem", "sm": "0.875rem", "base": "1rem", "lg": "1.125rem",
      "xl": "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem",
      "5xl": "3rem",   "6xl": "3.75rem", "7xl": "4.5rem"
    }
  }
}
```

(Read color values from `apps/landing/.content/brand.json#palette`. Don't hardcode if brand.json differs.)

### `apps/landing/src/styles/tokens.css` (CSS custom properties)

```css
/* Generated from tokens.json — do not edit by hand. */
:root {
  --color-bg:        #0F1117;
  --color-bg-elev:   #1E293B;
  --color-indigo:    #6366F1;
  --color-cyan:      #22D3EE;
  --color-violet:    #A78BFA;
  --color-text:      #F8FAFC;
  --color-text-muted:#94A3B8;
  --color-text-dim:  #64748B;
  --color-accent:    #EF4444;
  --color-border:    #1E293B;

  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.75rem;
  --space-4: 1rem;     --space-6: 1.5rem;  --space-8: 2rem;
  --space-10: 2.5rem;  --space-12: 3rem;   --space-16: 4rem;
  --space-20: 5rem;    --space-24: 6rem;   --space-32: 8rem;

  --radius-sm: 0.25rem; --radius-md: 0.5rem; --radius-lg: 0.75rem;
  --radius-xl: 1rem;    --radius-2xl: 1.5rem;
}
```

Then update `globals.css` to import tokens:

```css
@import "tailwindcss";
@import "./tokens.css";
```

## Process

1. Read `apps/landing/.content/brand.json`.
2. Generate `tokens.json` with colors from brand, plus the spacing/radius/type scale shown above (those are framework-wide constants, not brand-derived).
3. Generate `tokens.css` from `tokens.json`. The two files mirror each other.
4. Update `globals.css` to import tokens.css.
