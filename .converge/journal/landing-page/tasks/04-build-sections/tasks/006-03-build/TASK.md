---
id: 006-03-build
title: "Build: From zero to converged in 60s"
description: "Build the Quickstart.astro component from SPEC + DESIGN, with real copy from source files."
dependencies:
  - 006-02-design
tags:
  - build
  - section-quickstart
inputs:
  - apps/landing/.content/sections/quickstart/SPEC.md
  - apps/landing/.content/sections/quickstart/DESIGN.md
  - README.md
  - docs/concepts
outputs:
  - apps/landing/src/components/sections/Quickstart.astro
checks:
  - id: component-exists
    description: Quickstart.astro was created
    cmd: test -f apps/landing/src/components/sections/Quickstart.astro
  - id: component-uses-section-wrapper
    description: "component uses <Section> layout primitive"
    cmd: "test -f apps/landing/src/components/sections/Quickstart.astro && grep -qE '<Section\\s' apps/landing/src/components/sections/Quickstart.astro"
  - id: component-typecheck
    description: astro check passes for this component
    cmd: "test -f apps/landing/src/components/sections/Quickstart.astro && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*Quickstart\\.astro')"
  - id: no-hardcoded-hex
    description: no hardcoded hex colors (use brand tokens via Tailwind classes)
    cmd: "test -f apps/landing/src/components/sections/Quickstart.astro && ! grep -qE '#[0-9a-fA-F]{3,6}\\b' apps/landing/src/components/sections/Quickstart.astro"
  - id: no-placeholders
    description: no placeholder copy
    cmd: "test -f apps/landing/src/components/sections/Quickstart.astro && ! grep -qE 'Lorem|placeholder content|TBD|FIXME|TODO:' apps/landing/src/components/sections/Quickstart.astro"
vars:
  prefix: 006
  sectionId: quickstart
  title: From zero to converged in 60s
  componentName: Quickstart
  componentPath: apps/landing/src/components/sections/Quickstart.astro
  contentDir: apps/landing/.content/sections/quickstart
  intent: "Three-step terminal walkthrough mirroring README.md's quickstart block. Each step is a copy-button code block."
  specPath: apps/landing/.content/sections/quickstart/SPEC.md
  designPath: apps/landing/.content/sections/quickstart/DESIGN.md
  passedPath: apps/landing/.content/sections/quickstart/PASSED
  sectionTaskId: 006-quickstart
  prevLastId: 005-05-verify
  kebabName: quickstart
---

# Build: From zero to converged in 60s

Implement `apps/landing/src/components/sections/Quickstart.astro` per `apps/landing/.content/sections/quickstart/DESIGN.md`. All copy must come
from real source files.

## Structure

```astro
---
// apps/landing/src/components/sections/Quickstart.astro
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

<Section id="quickstart" padY="lg">
  <Container>
    {/* implementation per DESIGN.md */}
  </Container>
</Section>
```

## Process

1. Read `apps/landing/.content/sections/quickstart/SPEC.md` and `apps/landing/.content/sections/quickstart/DESIGN.md` from previous steps.
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
