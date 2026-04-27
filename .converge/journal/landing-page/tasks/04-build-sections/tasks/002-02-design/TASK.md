---
id: 002-02-design
title: "Design: Trusted by builders"
description: "Translate SPEC.md into a structural DESIGN.md describing component shape, props, slots, states."
dependencies:
  - 002-01-spec
tags:
  - design
  - section-social-proof
inputs:
  - apps/landing/.content/sections/social-proof/SPEC.md
  - apps/landing/src/components/ui
  - apps/landing/src/components/layout
outputs:
  - apps/landing/.content/sections/social-proof/DESIGN.md
checks:
  - id: design-md-exists
    description: apps/landing/.content/sections/social-proof/DESIGN.md exists
    cmd: test -f apps/landing/.content/sections/social-proof/DESIGN.md
  - id: design-has-content
    description: "DESIGN.md has >=30 lines"
    cmd: "test -f apps/landing/.content/sections/social-proof/DESIGN.md && test $(wc -l < apps/landing/.content/sections/social-proof/DESIGN.md) -ge 30"
  - id: design-lists-imports
    description: DESIGN.md lists which UI/layout primitives to import
    cmd: "test -f apps/landing/.content/sections/social-proof/DESIGN.md && grep -qE 'import|components/ui|components/layout' apps/landing/.content/sections/social-proof/DESIGN.md"
vars:
  prefix: 002
  sectionId: social-proof
  title: Trusted by builders
  componentName: SocialProof
  componentPath: apps/landing/src/components/sections/SocialProof.astro
  contentDir: apps/landing/.content/sections/social-proof
  intent: "Lightweight credibility row: GitHub stars (live), npm downloads (live). Honest about being early — 'Used by' not 'Trusted by Fortune 500'."
  specPath: apps/landing/.content/sections/social-proof/SPEC.md
  designPath: apps/landing/.content/sections/social-proof/DESIGN.md
  passedPath: apps/landing/.content/sections/social-proof/PASSED
  sectionTaskId: 002-social-proof
  prevLastId: 001-05-verify
  kebabName: social-proof
---

# Design: Trusted by builders

Translate `apps/landing/.content/sections/social-proof/SPEC.md` into a structural design at `apps/landing/.content/sections/social-proof/DESIGN.md`.
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

   <Section id="social-proof" padY="lg" bg="default">
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

1. Read `apps/landing/.content/sections/social-proof/SPEC.md` from the previous step.
2. Inspect `apps/landing/src/components/ui/` and `apps/landing/src/components/layout/` to see what primitives are available — the design must compose existing primitives, not invent new ones.
3. Write `apps/landing/.content/sections/social-proof/DESIGN.md` covering the 6 areas above. Use code blocks liberally for structure; prose minimally.

## Banned

- Designing in pure Tailwind classes without naming the regions. The next step (build) reads this and translates region names to JSX slots.
- Inventing new UI primitives. If the section needs something `components/ui/` doesn't have, flag it in the design and we'll add it to `03-design-system` — don't build a one-off.
