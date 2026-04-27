# Design: cta-banner

## 1. Component Skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Button from '@/components/ui/Button.astro';

interface Props { /* static section — no props */ }
---

<Section id="cta-banner" padY="lg" bg="default">
  <Container>
    <!-- eyebrow -->
    <!-- headline -->
    <!-- sub-tagline -->
    <!-- cta-row -->
  </Container>
</Section>
```

## 2. Slot Composition

| Region | Content source | Notes |
|---|---|---|
| `eyebrow` | — | Optional small label above headline |
| `headline` | `brand.json` tagline | H2, display type |
| `sub-tagline` | Brand voice one-liner | From `brand.json` or README.md motivation copy |
| `cta-row` | Primary + secondary buttons | Link to `/docs/getting-started` (primary), GitHub (secondary/ghost) |

## 3. Tailwind Class Plan

- **Section wrapper**: `relative overflow-hidden` — allows indigo glow to bleed
- **Background glow**: `bg-[var(--cv-indigo)]` at `5–10%` opacity, centered radial gradient behind content
- **Headline**: `text-4xl md:text-5xl font-display font-bold text-[var(--cv-text)] text-center`
- **Sub-tagline**: `text-lg text-[var(--cv-textMuted)] text-center mt-4`
- **CTA row**: `flex flex-col sm:flex-row gap-4 justify-center items-center mt-8`
  - Primary button: `variant="primary" size="lg" href="/docs/getting-started"` → "Read the docs"
  - Secondary button: `variant="ghost" size="lg" href="https://github.com/myanlabs/converge" external` → "Star on GitHub"
- **Color tokens**: use `var(--cv-text)`, `var(--cv-bg)`, `var(--cv-textMuted)`, `var(--cv-indigo)` — never raw hex

## 4. States

- **Hover (primary button)**: `hover:scale-105 transition-transform duration-150` — via Button primitive
- **Hover (ghost button)**: `hover:bg-bgElev` — via Button primitive ghost variant
- **Focus**: button focus ring via Button primitive (no custom focus styles needed)
- **Scroll-into-view**: single static state, no animation on scroll
- **Reduced motion**: respect `prefers-reduced-motion` — Button primitive handles this via `duration-150`

## 5. Accessibility Plan

- `Section`: `<section>` with `id="cta-banner"`
- `headline`: `<h2>` — conveys section purpose (not h1 — landing page hero is h1)
- CTA buttons: both `<a>` tags — no `<button>` here since each navigates
- `aria-label` on GitHub button: "Star Converge on GitHub" (clearer than button text alone)
- Focus order: headline → primary CTA → secondary CTA

## 6. Mobile Breakpoints (≤640px)

- CTA row stacks vertically: `flex-col`
- Buttons full-width at mobile: `w-full justify-center`
- Headline scales down: `text-3xl`
- Container padding tightens via `Container` primitive (no custom padding needed)