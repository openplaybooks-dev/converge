# Design: Quickstart Section

## 1. Component Skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import CodeBlock from '@/components/ui/CodeBlock.astro';

interface Props { /* no props — static section */ }
---
<Section id="quickstart" padY="lg" bg="default">
  <Container>
    <!-- content slots rendered inline -->
  </Container>
</Section>
```

## 2. Slot Composition

- **section-header**: Title "From zero to converged in 60s" as `<h2>` — precedes the step stack
- **step-1**: Install step — `CodeBlock` with `language="bash"`, label `1.`
- **step-2**: Init step — `CodeBlock` with `language="bash"`, label `2.`
- **step-3**: Plan+run step — `CodeBlock` with `language="bash"`, label `3.`
- **footer-cta**: Optional "What's next" text link below steps (not a CodeBlock)

## 3. Tailwind Class Plan

| Region | Classes | Notes |
|--------|----------|-------|
| Section | `py-16` (padY lg) | Reference brand token via `padY="lg"` |
| Container | default (max-w-6xl) | No custom max-width |
| Section header | `text-2xl font-bold text-text mb-8` | Heading h2, follows heading scale |
| Step labels | `text-sm font-mono text-textMuted mb-2` | monospace, muted text |
| CodeBlock wrapper | `mb-4` | Spacing between steps |
| Footer CTA | `text-sm text-textMuted` | Subdued link text |

## 4. States

- **Static** — no interactive states on the section itself
- CodeBlock copy button: `hover:text-text`, `active` shows "Copied!" for 2s (handled by CodeBlock's built-in script)
- Footer link: `hover:text-indigo` (brand token, no hardcoded hex)

## 5. Accessibility Plan

- Section header uses `<h2>` — not h1 (h1 is reserved for page hero)
- Each CodeBlock is wrapped in a `<figure>` with `<figcaption>` for the step label (`1.`, `2.`, `3.`) — provides context for screen readers
- Copy button: `aria-label="Copy install command"` (set dynamically per step via data attribute)
- Section has `id="quickstart"` for deep-link anchor
- No focus management needed (static section)

## 6. Mobile Breakpoints

- **640px+**: Single column, full-width CodeBlock
- **<640px**: CodeBlock text scales down (`text-xs`), horizontal scroll on code content via `overflow-x-auto`
- No layout reflow needed — vertical stack is single-column at all breakpoints