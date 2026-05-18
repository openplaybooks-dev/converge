---
id: 003-brand-spec
title: Emit brand.json — visual identity + voice extracted from banner + README
inputs:
  - banner.svg
  - README.md
outputs:
  - apps/landing/.content/brand.json
checks:
  - id: brand-json-exists
    cmd: "test -f apps/landing/src/.content/brand.json"
    description: brand.json exists
  - id: brand-json-valid
    cmd: "test -f apps/landing/src/.content/brand.json && node -e \"JSON.parse(require('fs').readFileSync('apps/landing/src/.content/brand.json','utf8'))\""
    description: brand.json is valid JSON
  - id: has-palette
    cmd: "test -f apps/landing/src/.content/brand.json && node -e \"const b=require('./apps/landing/src/.content/brand.json');const ok=b.palette&&Object.keys(b.palette).length>=4;process.exit(ok?0:1)\""
    description: palette has at least 4 named colors
  - id: has-tagline
    cmd: "test -f apps/landing/src/.content/brand.json && node -e \"const b=require('./apps/landing/src/.content/brand.json');process.exit(b.tagline==='Define done. Converge gets there.'?0:1)\""
    description: tagline matches canonical
  - id: has-voice
    cmd: "test -f apps/landing/src/.content/brand.json && node -e \"const b=require('./apps/landing/src/.content/brand.json');const ok=b.voice&&Array.isArray(b.voice.tone)&&b.voice.tone.length>=3;process.exit(ok?0:1)\""
    description: voice has tone descriptors
---

# Brand spec

Extract the brand into one structured file that every later component
reads. No `<style>` block in any component should hardcode a color that
isn't in `palette` here.

## Required shape

```json
{
  "name": "Converge",
  "tagline": "Define done. Converge gets there.",
  "domain": "converge.dev",
  "github": "https://github.com/openplaybooks-dev/converge",

  "palette": {
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

  "typography": {
    "display": "Inter",
    "body":    "Inter",
    "mono":    "JetBrains Mono"
  },

  "motif": ["convergence-journey", "gap-closing", "iterative-arrow"],

  "voice": {
    "tone": ["direct", "technical", "honest-about-trade-offs"],
    "banned": ["revolutionary", "next-generation", "AI-native", "game-changing"],
    "preferred": ["concrete", "shipped", "measurable", "verifiable"]
  }
}
```

## Process

1. **Palette**: read `banner.svg`. The hex colors visible in the SVG source ARE the brand palette. Extract them (named per the table above).
2. **Tagline**: must be exactly `"Define done. Converge gets there."` — verify against the README.md hero line.
3. **Voice**: derive `tone` from how the README's "Why Converge?" bullets are written (direct, claims trace to specific code/files, honest about trade-offs). The `banned` and `preferred` lists are checked against generated copy by phase 04 verification.
4. Write the file.

## Banned

- Hex colors not in `banner.svg`. If you want to add one, update banner.svg first.
- Tagline drift. The README is canonical; if the README's hero changed, fix this task to match — don't fork the brand.
