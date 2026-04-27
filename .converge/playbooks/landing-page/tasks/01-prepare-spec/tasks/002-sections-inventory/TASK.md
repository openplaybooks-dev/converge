---
id: 002-sections-inventory
title: Emit sections.json — the WBS data file for 04-build-sections
inputs:
  - README.md
  - docs/concepts
  - docs/getting-started/why-converge.md
outputs:
  - apps/landing/.content/sections.json
checks:
  - id: sections-json-exists
    cmd: "test -f apps/landing/.content/sections.json"
    description: sections.json exists
  - id: sections-json-valid
    cmd: "test -f apps/landing/.content/sections.json && node -e \"JSON.parse(require('fs').readFileSync('apps/landing/.content/sections.json','utf8'))\""
    description: sections.json is valid JSON
  - id: sections-count
    cmd: "test -f apps/landing/.content/sections.json && node -e \"const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s.length>=8?0:1)\""
    description: at least 8 sections defined
  - id: sections-have-required-fields
    cmd: "test -f apps/landing/.content/sections.json && node -e \"const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;const ok=s.every(x=>x.id&&x.title&&x.componentName&&x.intent);process.exit(ok?0:1)\""
    description: every section has id, title, componentName, intent
  - id: hero-first
    cmd: "test -f apps/landing/.content/sections.json && node -e \"const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[0].id==='hero'?0:1)\""
    description: first section is hero
  - id: cta-last
    cmd: "test -f apps/landing/.content/sections.json && node -e \"const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[s.length-1].id==='cta-banner'?0:1)\""
    description: last section is cta-banner
---

# Sections inventory

Emit the canonical list of 8 home-page sections in render order. The
`04-build-sections` WBS reads this file and spawns one parent task + 5
step children per entry. `id` order in the JSON is the render order on
the page.

## Required shape

```json
{
  "$schema": "../.content/schemas/sections.schema.json",
  "sections": [
    { "id": "hero",              "title": "Hero",                          "componentName": "Hero",                  "intent": "Tagline-first hero with the canonical 'Define done. Converge gets there.' line, an animated convergence motif, and two CTAs (Get started → /docs/getting-started, Star on GitHub)." },
    { "id": "social-proof",      "title": "Trusted by builders",           "componentName": "SocialProof",           "intent": "Lightweight credibility row: GitHub stars (live), npm downloads (live). Honest about being early — 'Used by' not 'Trusted by Fortune 500'." },
    { "id": "problem-solution",  "title": "Define how vs. define done",    "componentName": "ProblemSolution",       "intent": "Side-by-side: left shows imperative step-driven framework code; right shows declarative converge TASK.md. Visualizes the paradigm flip." },
    { "id": "feature-grid",      "title": "Six differentiators",           "componentName": "FeatureGrid",           "intent": "3×2 grid of differentiator cards sourced from README.md 'Why Converge?' bullets. Each card: lucide icon + headline + ≤180-char body." },
    { "id": "comparison",        "title": "Converge vs. step-driven",      "componentName": "InteractiveComparison", "intent": "Tabbed code panel — same workflow goal in LangGraph vs. Converge. Below: condensed feature matrix derived from docs/concepts/deterministic-checks.md and dynamic-work-breakdown.md." },
    { "id": "quickstart",        "title": "From zero to converged in 60s", "componentName": "Quickstart",            "intent": "Three-step terminal walkthrough mirroring README.md's quickstart block. Each step is a copy-button code block." },
    { "id": "faq",               "title": "FAQ",                           "componentName": "Faq",                   "intent": "8 disclosure items derived from the trade-offs sections of docs/concepts/*.md (each trade-off is an honest objection + honest answer). Native <details>; deep-link anchors." },
    { "id": "cta-banner",        "title": "Get started",                   "componentName": "CtaBanner",             "intent": "Final conversion banner: tagline restated + two CTAs (Read the docs / Star on GitHub). Subtle indigo glow background mirroring banner.svg." }
  ]
}
```

## Process

1. Use the JSON above as a starting point. The 8 sections are non-negotiable for v1 of the page.
2. If you tweak `intent` strings, keep them grounded in real source material (README.md, docs/concepts/*.md). No marketing-speak.
3. Write the file at `apps/landing/.content/sections.json`. Make sure it parses as JSON.

## Banned

- Adding a 9th section. The home page is finite. The FAQ is the catch-all for additional content.
- Reordering hero or cta-banner. They're anchors at the top and bottom respectively.
- `componentName` values that aren't valid PascalCase identifiers (they're used as Astro component names).
