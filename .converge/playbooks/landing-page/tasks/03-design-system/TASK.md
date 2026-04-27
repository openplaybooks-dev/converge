---
id: 03-design-system
title: Phase 03 — Design system (tokens, typography, base components, primitives, icons)
blocking: true
dependencies: [02-bootstrap-astro]
inputs:
  - apps/landing/.content/brand.json
  - banner.svg
outputs:
  - apps/landing/src/styles/tokens.json
  - apps/landing/src/styles/tokens.css
  - apps/landing/src/components/ui
  - apps/landing/src/components/layout
  - apps/landing/src/icons
---

The design system that every section in phase 04 builds on. Tokens come
from `brand.json`; typography is self-hosted (Inter + JetBrains Mono);
base components are unstyled-by-default with token-based variants; layout
primitives prevent each section reinventing padding/max-width.

Five leaf tasks (sequential):

1. **001-extract-tokens** — `tokens.json` (machine-readable) + `tokens.css` (CSS custom properties) from `brand.json`. Both files live in `src/styles/` and are imported by globals.css.

2. **002-typography** — Self-host Inter + JetBrains Mono via `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono`. Import in globals.css. Define type scale (h1–h6, body, caption) using token-based sizes.

3. **003-base-components** — Six primitives in `src/components/ui/`: `Button.astro`, `Badge.astro`, `Card.astro`, `CodeBlock.astro`, `Pill.astro`, `Disclosure.astro`. Each has variants exposed via props; no section component should reimplement these.

4. **004-layout-primitives** — Four layout helpers in `src/components/layout/`: `Container.astro` (max-width cap), `Section.astro` (consistent padY + bg variants + id prop for anchors), `Grid.astro` (responsive columns), `Spacer.astro` (vertical gaps).

5. **005-iconography** — Lucide icon set via `@iconify-json/lucide` + a custom `converge-mark.svg` (the brand monogram) and `convergence-journey.svg` placeholder for the hero animation. Set up `<Icon>` component wrapper.

After this phase: `pnpm --filter @converge/landing astro check` is green; the home page (still placeholder) renders with brand fonts loaded.
