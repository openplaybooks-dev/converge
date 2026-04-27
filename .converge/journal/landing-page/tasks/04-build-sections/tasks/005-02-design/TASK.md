---
id: 005-02-design
title: "Design: Converge vs. step-driven"
description: "Translate SPEC.md into a structural DESIGN.md describing component shape, props, slots, states."
dependencies:
  - 005-01-spec
tags:
  - design
  - section-comparison
inputs:
  - apps/landing/.content/sections/comparison/SPEC.md
  - apps/landing/src/components/ui
  - apps/landing/src/components/layout
outputs:
  - apps/landing/.content/sections/comparison/DESIGN.md
checks:
  - id: design-md-exists
    description: apps/landing/.content/sections/comparison/DESIGN.md exists
    cmd: test -f apps/landing/.content/sections/comparison/DESIGN.md
  - id: design-has-content
    description: "DESIGN.md has >=30 lines"
    cmd: "test -f apps/landing/.content/sections/comparison/DESIGN.md && test $(wc -l < apps/landing/.content/sections/comparison/DESIGN.md) -ge 30"
  - id: design-lists-imports
    description: DESIGN.md lists which UI/layout primitives to import
    cmd: "test -f apps/landing/.content/sections/comparison/DESIGN.md && grep -qE 'import|components/ui|components/layout' apps/landing/.content/sections/comparison/DESIGN.md"
vars:
  prefix: 005
  sectionId: comparison
  title: Converge vs. step-driven
  componentName: InteractiveComparison
  componentPath: apps/landing/src/components/sections/InteractiveComparison.astro
  contentDir: apps/landing/.content/sections/comparison
  intent: "Tabbed code panel — same workflow goal in LangGraph vs. Converge. Below: condensed feature matrix derived from docs/concepts/deterministic-checks.md and dynamic-work-breakdown.md."
  specPath: apps/landing/.content/sections/comparison/SPEC.md
  designPath: apps/landing/.content/sections/comparison/DESIGN.md
  passedPath: apps/landing/.content/sections/comparison/PASSED
  sectionTaskId: 005-comparison
  prevLastId: 004-05-verify
  kebabName: interactive-comparison
---

# Design: Converge vs. step-driven

Translate `apps/landing/.content/sections/comparison/SPEC.md` into a structural design at `apps/landing/.content/sections/comparison/DESIGN.md`.
This is the bridge between "what" (SPEC) and "how" (BUILD).

## What goes in DESIGN.md

1. **Component skeleton** — the Astro frontmatter and template structure as a code block (don't implement yet, just shape):
   ```astro
   ---
   import Section from '@/components/layout/Section.astro';
   import Container from '@/components/layout/Container.astro';
   import Button from '@/components/ui/Button.astro';
   // ... other imports

   interface Props { /* ... */ }
   const {} = Astro.props;
   ---

   <Section id="comparison" padY="lg" bg="default">
     <Container>
       <!-- structure goes here -->
     </Container>
   </Section>
   ```
2. **Slot composition** — name each region (hero-eyebrow, hero-headline, hero-cta, etc.) and what it renders.
3. **Tailwind class plan** — typography sizes per region, spacing, alignment. Reference brand tokens by name (e.g. `text-text`, `bg-bg-elev`), never raw hex.
4. **States** — what changes on hover, focus, scroll-into-view, reduced-motion. List them concretely.
5. **Accessibility plan** — semantic HTML elements (h1 vs h2 vs p), aria-labels, focus order, contrast notes.
6. **Mobile breakpoints** — how the layout reflows below 640px.

## Process

1. Read `apps/landing/.content/sections/comparison/SPEC.md` from the previous step.
2. Inspect `apps/landing/src/components/ui/` and `apps/landing/src/components/layout/` to see what primitives are available — the design must compose existing primitives, not invent new ones.
3. Write `apps/landing/.content/sections/comparison/DESIGN.md` covering the 6 areas above. Use code blocks liberally for structure; prose minimally.

## Banned

- Designing in pure Tailwind classes without naming the regions. The next step (build) reads this and translates region names to JSX slots.
- Inventing new UI primitives. If the section needs something `components/ui/` doesn't have, flag it in the design and we'll add it to `03-design-system` — don't build a one-off.
