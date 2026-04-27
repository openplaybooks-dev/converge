# Design: FAQ

## 1. Component Skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Disclosure from '@/components/ui/Disclosure.astro';

interface Props {
  items: Array<{
    question: string;
    answer: string;
    slug: string;
  }>;
}
const { items } = Astro.props;
---

<Section id="faq" padY="lg" bg="default">
  <Container maxWidth="720px">
    {items.map((item) => (
      <Disclosure id={`faq-${item.slug}`}>
        <Fragment slot="summary">{item.question}</Fragment>
        <Fragment>{item.answer}</Fragment>
      </Disclosure>
    ))}
  </Container>
</Section>
```

## 2. Slot Composition

| Region | Slot name | Renders |
|--------|-----------|---------|
| Question | `summary` | FAQ item question text |
| Answer | default | FAQ item answer (markdown string) |

## 3. Tailwind Class Plan

- **Section wrapper**: `py-16` (padY="lg"), `bg-default` (transparent page bg)
- **Container**: `max-w-[720px] mx-auto px-4`
- **Disclosure border**: `border border-border` (from `tokens/brand.json`)
- **Summary (question)**: `px-4 py-3 cursor-pointer list-none text-text hover:bg-bgElev transition-colors`
- **Answer body**: `px-4 py-3 border-t border-border text-textMuted`
- **Typography**: questions use `text-text` (brand token), answers use `text-textMuted` for softer contrast

## 4. States

- **Closed (default)**: `<details>` closed, only question visible
- **Open**: `open` attribute set, answer rendered below question
- **Hover**: `hover:bg-bgElev` on summary row
- **Focus**: native `<details>` focus ring — keyboard accessible via Tab/Enter/Space
- **Reduced motion**: no animation to disable — `<details>` transition is CSS-only and minimal

## 5. Accessibility Plan

- Semantic `<details>` / `<summary>` — native accordion, no ARIA needed
- `id="faq-{slug}"` on each `<details>` element for deep-links (`#faq-checks-authoring`)
- `list-none` on `<summary>` removes disclosure arrow (replaced by custom styles if needed)
- Focus order: natural DOM order, one item per Tab stop
- All text uses brand tokens — contrast ratios already validated in brand.json

## 6. Mobile Breakpoints

- **320px+**: single column, full-width up to Container max-width of 720px
- **No layout reflow needed**: vertical stack is the default state
- Container already centers with `mx-auto` — no explicit `@media` needed