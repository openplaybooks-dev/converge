---
id: 005-04-integrate
title: "Integrate: Converge vs. step-driven"
description: Mount the InteractiveComparison component in src/pages/index.astro at the correct position.
dependencies:
  - 005-03-build
tags:
  - integrate
  - section-comparison
inputs:
  - apps/landing/src/components/sections/InteractiveComparison.astro
  - apps/landing/.content/sections.json
outputs:
  - apps/landing/src/pages/index.astro
checks:
  - id: index-astro-exists
    description: index.astro exists
    cmd: test -f apps/landing/src/pages/index.astro
  - id: component-imported
    description: InteractiveComparison is imported in index.astro
    cmd: "test -f apps/landing/src/pages/index.astro && grep -qE \"import\\s+InteractiveComparison\\s+from\" apps/landing/src/pages/index.astro"
  - id: component-rendered
    description: "<InteractiveComparison> is rendered in index.astro"
    cmd: "test -f apps/landing/src/pages/index.astro && grep -qE '<InteractiveComparison\\b' apps/landing/src/pages/index.astro"
  - id: build-clean
    description: astro check still passes after integration
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing astro check"
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

# Integrate: Converge vs. step-driven

Add the import + render of `<InteractiveComparison>` to
`apps/landing/src/pages/index.astro` at the right position.

The "right position" is the order defined in
`apps/landing/.content/sections.json`. Section #005 renders in
position #005.

## Process

1. Read `apps/landing/.content/sections.json` to confirm position order.
2. Read current `apps/landing/src/pages/index.astro`.
3. Add the import: `import InteractiveComparison from '@/components/sections/InteractiveComparison.astro';` (insert in alphabetical order with other section imports).
4. Add the render: `<InteractiveComparison />` in the page body, in the position dictated by sections.json. If earlier sections (`<Hero />`, `<SocialProof />`, etc.) are already mounted, place this one after them but before any later-ordered sections.
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
