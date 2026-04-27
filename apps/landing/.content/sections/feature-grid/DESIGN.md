# Design: Six differentiators (FeatureGrid)

## 1. Component Skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Grid from '@/components/layout/Grid.astro';
import Card from '@/components/ui/Card.astro';
import Icon from '@/components/ui/Icon.astro';

interface Props {
  features: Array<{
    icon: string;
    headline: string;
    body: string;
  }>;
}
const { features } = Astro.props;
---

<Section id="feature-grid" padY="lg" bg="default">
  <Container>
    <Grid cols={3} gap="var(--cv-space-4)">
      {features.map((feature) => (
        <Card id={feature.headline} pad="var(--cv-space-6)" bg="elev" border>
          <Icon name={feature.icon} size="lg" color="var(--cv-indigo)" />
          <h3>{feature.headline}</h3>
          <p>{feature.body}</p>
        </Card>
      ))}
    </Grid>
  </Container>
</Section>
```

## 2. Slot Composition

| Region | What it renders |
|---|---|
| `feature-icon` | `Icon` component — lucide icon per card, color `var(--cv-indigo)` |
| `feature-headline` | `<h3>` — card headline text, ≤8 words |
| `feature-body` | `<p>` — card body text, ≤180 chars |

## 3. Tailwind Class Plan

| Region | Classes | Notes |
|---|---|---|
| Section wrapper | `pad-y-lg`, `bg-default` | Uses brand token via Section props |
| Card container | `bg-elev`, `border`, `p-6` | Background `var(--cv-bg-elev)`, border `1px solid var(--cv-border)`, padding `var(--cv-space-6)` |
| Icon | `mb-4`, `text-indigo` | Color `var(--cv-indigo)`, spacing below icon |
| Headline | `text-lg`, `font-semibold`, `text-text` | Typography hierarchy, headline ≤8 words |
| Body | `text-sm`, `text-text-muted` | Secondary text, body ≤180 chars |

All colors reference brand tokens (`text-text`, `bg-bg-elev`, `border`, `cv-indigo`, `cv-cyan`) — no raw hex.

## 4. States

- **Hover**: card elevates with `box-shadow` (value from brand tokens); icon shifts from `var(--cv-indigo)` to `var(--cv-cyan)`
- **Focus**: card receives focus ring using `var(--cv-cyan)`; keyboard-navigable
- **Reduced-motion**: no animated elevation; transitions collapse to instant state changes

## 5. Accessibility Plan

- Section: `<section id="feature-grid" aria-labelledby="feature-grid-heading">` with visible heading
- Each card: `<article>` or `<li>` with `tabindex="0"` for keyboard navigation
- Icon: `aria-hidden="true"` (decorative; semantic meaning conveyed by headline)
- Headline: `<h3>` inside each card for document outline hierarchy
- Focus ring: `outline: 2px solid var(--cv-cyan)`, `outline-offset: 2px`
- Contrast: all text combinations verified against brand palette contrast ratios

## 6. Mobile Breakpoints

| Breakpoint | Layout |
|---|---|
| ≥1024px | 3 columns (3×2 grid) |
| 768px–1023px | 2 columns (2×3 grid) |
| <768px | 1 column (1×6 stack) |

Grid gap remains `var(--cv-space-4)` (24px) at all breakpoints via `Grid` component responsive props. Card padding stays `var(--cv-space-6)` (32px). No aspect-ratio lockouts that would break at 320px.

## UI/Layout Primitives Used

- `components/layout/Section.astro` — page section wrapper
- `components/layout/Container.astro` — max-width container
- `components/layout/Grid.astro` — responsive CSS grid
- `components/ui/Card.astro` — card container
- `components/ui/Icon.astro` — lucide icon renderer
