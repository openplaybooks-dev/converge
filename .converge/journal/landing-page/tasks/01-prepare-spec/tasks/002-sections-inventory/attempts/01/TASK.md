# Task: 01-prepare-spec/002-sections-inventory

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