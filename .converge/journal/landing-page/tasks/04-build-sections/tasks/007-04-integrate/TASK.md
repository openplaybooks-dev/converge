---
id: 007-04-integrate
title: "Integrate: FAQ"
description: Mount the Faq component in src/pages/index.astro at the correct position.
dependencies:
  - 007-03-build
tags:
  - integrate
  - section-faq
inputs:
  - apps/landing/src/components/sections/Faq.astro
  - apps/landing/.content/sections.json
outputs:
  - apps/landing/src/pages/index.astro
checks:
  - id: index-astro-exists
    description: index.astro exists
    cmd: test -f apps/landing/src/pages/index.astro
  - id: component-imported
    description: Faq is imported in index.astro
    cmd: "test -f apps/landing/src/pages/index.astro && grep -qE \"import\\s+Faq\\s+from\" apps/landing/src/pages/index.astro"
  - id: component-rendered
    description: "<Faq> is rendered in index.astro"
    cmd: "test -f apps/landing/src/pages/index.astro && grep -qE '<Faq\\b' apps/landing/src/pages/index.astro"
  - id: build-clean
    description: astro check still passes after integration
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing astro check"
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

# Integrate: FAQ

Add the import + render of `<Faq>` to
`apps/landing/src/pages/index.astro` at the right position.

The "right position" is the order defined in
`apps/landing/.content/sections.json`. Section #007 renders in
position #007.

## Process

1. Read `apps/landing/.content/sections.json` to confirm position order.
2. Read current `apps/landing/src/pages/index.astro`.
3. Add the import: `import Faq from '@/components/sections/Faq.astro';` (insert in alphabetical order with other section imports).
4. Add the render: `<Faq />` in the page body, in the position dictated by sections.json. If earlier sections (`<Hero />`, `<SocialProof />`, etc.) are already mounted, place this one after them but before any later-ordered sections.
5. The page should be wrapped in `<MainLayout>` (built later in phase 05). For now, if MainLayout doesn't exist yet, use the default `<Layout>` from the Astro scaffold — phase 05 will swap it.
6. Run `pnpm --filter @converge/landing astro check` to verify.

## Example shape after several sections are mounted

```astro
---
import Layout from '@/layouts/Layout.astro';   // or MainLayout once phase 05 lands
import CtaBanner from '@/components/sections/CtaBanner.astro';
import Faq from '@/components/sections/Faq.astro';
import FeatureGrid from '@/components/sections/FeatureGrid.astro';
import Hero from '@/components/sections/Hero.astro';
import InteractiveComparison from '@/components/sections/InteractiveComparison.astro';
import ProblemSolution from '@/components/sections/ProblemSolution.astro';
import Quickstart from '@/components/sections/Quickstart.astro';
import SocialProof from '@/components/sections/SocialProof.astro';
---

<Layout>
  <Hero />
  <SocialProof />
  <ProblemSolution />
  <FeatureGrid />
  <InteractiveComparison />
  <Quickstart />
  <Faq />
  <CtaBanner />
</Layout>
```

## Banned

- Mounting at the wrong position. Position 1 is hero; position 8 is cta-banner. The order in sections.json IS the render order.
- Adding logic to index.astro beyond the imports + section tags. The page is a manifest, not a controller.
