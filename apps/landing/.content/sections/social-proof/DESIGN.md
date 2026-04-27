# DESIGN.md — social-proof

## 1. Component skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Spacer from '@/components/layout/Spacer.astro';
import Badge from '@/components/ui/Badge.astro';
import Icon from '@/components/ui/Icon.astro';
// Live data fetched at build time via fetch()
interface Props {}
const {} = Astro.props;
---

<Section id="social-proof" padY="lg" bg="elev">
  <Container>
    <!-- metrics-row -->
  </Container>
</Section>
```

## 2. Slot composition

No slots — this is a static single-state section. Regions are:

- **metrics-row** — wraps the two metric cells side-by-side (desktop) or stacked (mobile)
- **metric-github** — star count from GitHub API, falls back to "-"
- **metric-npm** — download count from npm API, falls back to "-"

## 3. Tailwind class plan

| Region | Typography | Spacing | Notes |
|--------|-----------|---------|-------|
| metrics-row | — | flex row, gap-8, center | divider via border-l on second child desktop; flex-col stacked mobile |
| metric-cell | — | flex col, gap-1 | — |
| metric-value | text-2xl font-mono | — | `text-text` (#F8FAFC) |
| metric-label | text-sm | — | `text-textMuted` (#94A3B8) |

Background on `<Section>`: `bg="elev"` maps to `bgElev` token (#1E293B). Never use raw hex.

## 4. States

Single static state — no hover, focus, or scroll transitions. Reduced-motion: no animation to disable.

## 5. Accessibility plan

- `<Section>` renders as `<section>` — includes `aria-label="Social proof"`
- Metrics are raw numbers in `<span>` — not interactive, no `role`
- No focusable elements — skip focus order considerations
- Contrast: `text-text` (#F8FAFC) on `bgElev` (#1E293B) passes WCAG AA for body text

## 6. Mobile breakpoints

- **< 640px**: `flex-col`, items center, gap-6 vertical stack. Divider hidden.
- **≥ 640px**: `flex-row`, items center, gap-8 horizontal. Second child gets `border-l border-white/10` divider.

## Required primitives

Import from `@/components/layout/`:
- `Section.astro` — provides `<section>` with bg and padY props
- `Container.astro` — centers and constrains width
- `Spacer.astro` — vertical spacing between rows if needed

Import from `@/components/ui/`:
- `Badge.astro` — optional, if branding uses a badge style for the "GitHub stars" label
- `Icon.astro` — for GitHub/npm icons if needed

No new UI primitives required.