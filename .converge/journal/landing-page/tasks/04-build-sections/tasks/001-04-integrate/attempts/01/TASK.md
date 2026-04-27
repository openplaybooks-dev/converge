# Task: 04-build-sections/001-04-integrate

# Integrate: Hero

Add the import + render of `<Hero>` to
`apps/landing/src/pages/index.astro` at the right position.

The "right position" is the order defined in
`apps/landing/.content/sections.json`. Section #001 renders in
position #001.

## Process

1. Read `apps/landing/.content/sections.json` to confirm position order.
2. Read current `apps/landing/src/pages/index.astro`.
3. Add the import: `import Hero from '@/components/sections/Hero.astro';` (insert in alphabetical order with other section imports).
4. Add the render: `<Hero />` in the page body, in the position dictated by sections.json. If earlier sections (`<Hero />`, `<SocialProof />`, etc.) are already mounted, place this one after them but before any later-ordered sections.
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