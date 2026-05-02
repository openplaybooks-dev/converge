---
id: "{{prefix}}-03-build"
title: "Build: {{title}}"
description: "Build the {{componentName}}.astro component from SPEC + DESIGN, with real copy from source files."
dependencies: ["{{prefix}}-02-design"]
tags: [build, "section-{{sectionId}}"]
inputs:
  - "{{specPath}}"
  - "{{designPath}}"
  - README.md
  - docs/concepts
outputs:
  - "{{componentPath}}"
checks:
  - id: component-exists
    cmd: "test -f {{componentPath}}"
    description: "{{componentName}}.astro was created"
  - id: component-uses-section-wrapper
    cmd: "test -f {{componentPath}} && grep -qE '<Section\\s' {{componentPath}}"
    description: component uses <Section> layout primitive
  - id: component-typecheck
    cmd: "test -f {{componentPath}} && pnpm --filter @converge/landing astro check 2>&1 | (! grep -E 'error.*{{componentName}}\\.astro')"
    description: astro check passes for this component
  - id: no-hardcoded-hex
    cmd: "test -f {{componentPath}} && ! grep -qE '#[0-9a-fA-F]{3,6}\\b' {{componentPath}}"
    description: no hardcoded hex colors (use brand tokens via Tailwind classes)
  - id: no-placeholders
    cmd: "test -f {{componentPath}} && ! grep -qE 'Lorem|placeholder content|TBD|FIXME|TODO:' {{componentPath}}"
    description: no placeholder copy
---

# Build: {{title}}

Implement `{{componentPath}}` per `{{designPath}}`. All copy must come
from real source files.

## Structure

```astro
---
// {{componentPath}}
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

<Section id="{{sectionId}}" padY="lg">
  <Container>
    {/* implementation per DESIGN.md */}
  </Container>
</Section>
```

## Process

1. Read `{{specPath}}` and `{{designPath}}` from previous steps.
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
