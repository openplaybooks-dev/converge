---
id: 003-extract-tokens
title: Extract design tokens into tokens.json
description: Parse Tailwind configs from reference code.html files and the chosen DESIGN.md into a single tokens.json that is the single source of truth for theming.
dependencies:
  - 002-emit-design-md
tags:
  - design
  - tokens
inputs:
  - .stitch/system/DESIGN.md
  - .stitch/references/**/code.html
outputs:
  - .stitch/system/tokens.json
checks:
  - id: tokens-valid
    cmd: python3 -c "import json; json.load(open('.stitch/system/tokens.json'))"
    description: tokens.json is valid JSON
  - id: tokens-has-colors
    cmd: python3 -c "import json,sys; t=json.load(open('.stitch/system/tokens.json')); sys.exit(0 if 'colors' in t and isinstance(t['colors'],dict) and len(t['colors'])>=5 else 1)"
    description: tokens.json has at least 5 color entries
  - id: tokens-has-typography
    cmd: python3 -c "import json,sys; t=json.load(open('.stitch/system/tokens.json')); sys.exit(0 if 'typography' in t and 'fontFamilies' in t['typography'] else 1)"
    description: tokens.json has typography.fontFamilies
  - id: tokens-has-radius
    cmd: python3 -c "import json,sys; t=json.load(open('.stitch/system/tokens.json')); sys.exit(0 if 'radius' in t else 1)"
    description: tokens.json has radius section
---

# Extract design tokens

Distill the design system into a machine-readable token file that the Flutter theme and every downstream screen build can reuse.

## Inputs

- `.stitch/system/DESIGN.md` — chosen design system (authoritative for rules)
- `.stitch/references/**/code.html` — Tailwind `<script id="tailwind-config">` blocks contain the exact hex values used by reference screens

## Strategy

Tailwind configs are easier to parse than prose. Prefer Tailwind values for numeric tokens; fall back to DESIGN.md prose when Tailwind is silent.

1. Grep every `code.html` for `<script id="tailwind-config">` and parse the JS object that follows. Key paths: `theme.extend.colors`, `theme.extend.borderRadius`, `theme.extend.fontFamily`, `theme.extend.boxShadow`.
2. Merge duplicates. When the same key appears in multiple references with different values, prefer the value in the **chosen system** (per DECISION.md). Record disagreements as a `conflicts` map for transparency.
3. Read DESIGN.md for spacing scale, shadow rules, and any tokens that live only in prose (e.g. "24dp vertical rhythm" → `spacing.md = 24`).
4. Emit `.stitch/system/tokens.json`.

## Output schema

```json
{
  "provenance": {
    "designSystem": ".stitch/references/serene_guardian/DESIGN.md",
    "generatedAt": "2026-04-25T...Z"
  },
  "colors": {
    "surface":                "#fbf9f5",
    "surfaceContainerLow":    "#f5f4ee",
    "surfaceContainer":       "#efeee8",
    "surfaceContainerHigh":   "#e8e9e1",
    "surfaceContainerLowest": "#ffffff",
    "onSurface":              "#31332e",
    "onSurfaceVariant":       "#5e6059",
    "primary":                "#5e5e5e",
    "onPrimary":              "#faf7f6",
    "secondary":              "#4f635e",
    "tertiaryContainer":      "#dff6ee",
    "error":                  "#9f403d",
    "errorContainer":         "#fe8b70",
    "mint":                   "#D1EEDD",
    "peach":                  "#FFDAD6",
    "honey":                  "#FFECB3",
    "alertPeach":             "#FCEEE9"
  },
  "typography": {
    "fontFamilies": {
      "display":  "Plus Jakarta Sans",
      "body":     "Manrope",
      "label":    "Manrope",
      "mono":     "JetBrains Mono"
    },
    "googleFonts": ["Plus Jakarta Sans", "Manrope", "JetBrains Mono"],
    "letterSpacingTight": -0.02
  },
  "radius": {
    "sm":    8,
    "md":    16,
    "lg":    32,
    "xl":    48,
    "full":  9999
  },
  "spacing": {
    "xs":   4,
    "sm":   8,
    "md":   24,
    "lg":   32,
    "xl":   40
  },
  "shadow": {
    "soft": "0 8px 24px rgba(231, 227, 220, 0.4)"
  },
  "conflicts": [
    {
      "key": "colors.primary",
      "resolved": "#5e5e5e",
      "seen": {".stitch/references/serene_guardian/...": "#5e5e5e", ".stitch/references/lullaby_minimal/...": "#5f5e5e"}
    }
  ]
}
```

## Rules

- **Every color value must be a hex string**, `#rrggbb` or `#rrggbbaa`. No named colors, no rgba() strings, no CSS variables.
- **Every numeric value must be a number** (int or float), not a string like `"24px"`. Unit is implicit: `spacing`/`radius` are dp, `letterSpacingTight` is em.
- Keys in `colors` must be `camelCase`.
- `conflicts` is optional but encouraged for any value that differed across sources.

## Success Criteria

- `tokens.json` is valid JSON
- `colors` has ≥ 5 entries and every value matches `^#[0-9a-fA-F]{6,8}$`
- `typography.fontFamilies` present
- `radius` present
