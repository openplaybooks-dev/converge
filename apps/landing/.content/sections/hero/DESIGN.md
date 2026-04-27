# Design: Hero

## 1. Component Skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Button from '@/components/ui/Button.astro';

interface Props { /* none — static section */ }
const {} = Astro.props;
---

<Section id="hero" padY="lg" bg="default">
  <Container>
    <!-- hero-motif -->
    <!-- hero-headline -->
    <!-- hero-subtext -->
    <!-- hero-cta -->
  </Container>
</Section>
```

## 2. Slot Composition

| Slot region | Renders | Source |
|---|---|---|
| `hero-motif` | Animated convergence SVG | brand.json motif keywords |
| `hero-eyebrow` | Optional eyebrow label ("Converge" pill) | brand.json |
| `hero-headline` | `<h1>` tagline: "Define done. Converge gets there." | brand.json |
| `hero-subtext` | One-liner from brand voice | brand.json / README.md |
| `hero-cta` | `<Button variant="primary">Get started</Button>` + `<Button variant="ghost">Star on GitHub</Button>` | SPEC §3 |

## 3. Tailwind Class Plan

| Region | Typography | Spacing | Alignment |
|---|---|---|---|
| `hero-motif` | — | `mb-6` | `flex justify-center` |
| `hero-headline` | `text-4xl sm:text-5xl lg:text-6xl font-bold text-text` | `mb-4` | `text-center` |
| `hero-subtext` | `text-lg text-text-muted` | `mb-8` | `text-center` |
| `hero-cta` | Button primitives only | `gap-4 flex-wrap` | `flex justify-center items-center` |

**Brand tokens to use**: `text-text`, `text-text-muted`, `bg-indigo`, `bg-indigo/10`, `bg-surface`, `bg-surface-elevated`.

**Banned**: raw hex values. Use CSS custom properties or Tailwind color tokens from the design system only.

## 4. States

- **Default**: centered stacked layout, motif animating.
- **Hover (primary CTA)**: `hover:scale-105` via Button primary variant.
- **Hover (secondary CTA)**: `hover:bg-indigo/10` via Button ghost variant.
- **Focus**: browser default focus ring (no custom focus ring needed — Button handles it).
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` — halt or disable the motif CSS animation loop.

## 5. Accessibility Plan

- `<h1>` for the canonical tagline — no `<h2>` or `<p>` for the headline.
- Primary CTA `Get started` → `/docs/getting-started`: `<a>` with `href` attribute.
- Secondary CTA `Star on GitHub` → `https://github.com/…`: `<a>` with `external` prop, gets `target="_blank"` and `rel="noopener noreferrer"`.
- Motif: add `aria-hidden="true"` to the SVG; it is decorative.
- Section: `<Section id="hero">` provides the landmark; no additional `aria-label` needed.
- Contrast: `text-text` on any default bg must meet WCAG AA — verify with brand token values.

## 6. Mobile Breakpoints (below 640px)

- **Stack everything**: headline, subtext, CTA row reflow to full-width.
- **CTAs**: `flex-col gap-4` on mobile (`<640px`), `flex-row` on `sm:` and up.
- **Motif**: scales down via `width: clamp(200px, 50vw, 400px)`.
- **Typography**: `text-4xl` on mobile, `text-5xl` at `sm:`, `text-6xl` at `lg:`.

## UI Primitives Required

- `Section.astro` — `padY="lg"`, `bg="default"`
- `Container.astro` — default max-width
- `Button.astro` — `variant="primary"` (CTA 1), `variant="ghost"` (CTA 2)
- No additional UI primitives needed for this section.
