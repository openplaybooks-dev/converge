---
id: 007-03-build
title: "Build: FAQ"
description: "Build the Faq.astro component from SPEC + DESIGN, with real copy from source files."
dependencies:
  - 007-02-design
tags:
  - build
  - section-faq
inputs:
  - apps/landing/.content/sections/faq/SPEC.md
  - apps/landing/.content/sections/faq/DESIGN.md
  - README.md
  - docs/concepts
outputs:
  - apps/landing/src/components/sections/Faq.astro
checks:
  - id: component-exists
    description: Faq.astro was created
    cmd: test -f apps/landing/src/components/sections/Faq.astro
  - id: component-uses-section-wrapper
    description: "component uses <Section> layout primitive"
    cmd: "test -f apps/landing/src/components/sections/Faq.astro && grep -qE '<Section\\s' apps/landing/src/components/sections/Faq.astro"
  - id: component-typecheck
    description: astro check passes for this component
    cmd: "test -f apps/landing/src/components/sections/Faq.astro && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*Faq\\.astro')"
  - id: no-hardcoded-hex
    description: no hardcoded hex colors (use brand tokens via Tailwind classes)
    cmd: "test -f apps/landing/src/components/sections/Faq.astro && ! grep -qE '#[0-9a-fA-F]{3,6}\\b' apps/landing/src/components/sections/Faq.astro"
  - id: no-placeholders
    description: no placeholder copy
    cmd: "test -f apps/landing/src/components/sections/Faq.astro && ! grep -qE 'Lorem|placeholder content|TBD|FIXME|TODO:' apps/landing/src/components/sections/Faq.astro"
vars:
  prefix: 007
  sectionId: faq
  title: FAQ
  componentName: Faq
  componentPath: apps/landing/src/components/sections/Faq.astro
  contentDir: apps/landing/.content/sections/faq
  intent: "8 disclosure items derived from the trade-offs sections of docs/concepts/*.md (each trade-off is an honest objection + honest answer). Native <details>; deep-link anchors."
  specPath: apps/landing/.content/sections/faq/SPEC.md
  designPath: apps/landing/.content/sections/faq/DESIGN.md
  passedPath: apps/landing/.content/sections/faq/PASSED
  sectionTaskId: 007-faq
  prevLastId: 006-05-verify
  kebabName: faq
---

# Build: FAQ

Implement `apps/landing/src/components/sections/Faq.astro` per `apps/landing/.content/sections/faq/DESIGN.md`. All copy must come
from real source files.

## Structure

```astro
---
// apps/landing/src/components/sections/Faq.astro
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
// ... other UI primitives

// Read content. Examples by section:
//   hero      → tagline from apps/landing/.content/brand.json
//   feature-grid → features from README.md "Why Converge?" bullets
//   comparison → matrix derived from docs/concepts/{deterministic-checks,dynamic-work-breakdown}.md
//   faq       → trade-offs sections from docs/concepts/*.md
//   quickstart → README.md "## Quick Start" code block
---

<Section id="faq" padY="lg">
  <Container>
    {/* implementation per DESIGN.md */}
  </Container>
</Section>
```

## Process

1. Read `apps/landing/.content/sections/faq/SPEC.md` and `apps/landing/.content/sections/faq/DESIGN.md` from previous steps.
2. Read every content source file the spec listed.
3. Implement the component. Use brand tokens via Tailwind classes (`text-text`, `bg-bg-elev`, `text-indigo`, etc.) — never raw hex.
4. Use existing UI primitives from `components/ui/` (Button, Card, etc.) — don't reimplement them.
5. Run `pnpm --filter @converge/landing astro check` to verify TS validates.

## Per-section content sources (recap)

| Section ID | Primary source | Secondary source |
|---|---|---|
| hero            | `apps/landing/.content/brand.json` (tagline) | `README.md` (subhead voice) |
| social-proof    | static counts (200+ stars, etc.) — placeholder ok | — |
| problem-solution | `docs/concepts/dynamic-work-breakdown.md` (pre-declared-graph problem) | — |
| feature-grid    | `README.md` "Why Converge?" bullets (6 items) | — |
| comparison      | `docs/concepts/deterministic-checks.md` + `dynamic-work-breakdown.md` (contrasts) | — |
| quickstart      | `README.md` "## Quick Start" block (4 commands) | — |
| faq             | trade-offs sections of all 4 `docs/concepts/*.md` pages | `README.md` |
| cta-banner      | `apps/landing/.content/brand.json` (tagline restated) | — |

## Banned

- Hardcoding any hex color. Use Tailwind classes that reference brand tokens.
- Marketing-speak ("revolutionary", "next-generation", "AI-native"). Match the README's voice.
- Re-implementing Button/Card/etc. inline. Always import from `components/ui/`.
- Any text that doesn't trace to a source file listed in the SPEC. If the section needs new copy, write it into the SPEC first.
