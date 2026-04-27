# Design: problem-solution

## 1. Component Skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Grid from '@/components/layout/Grid.astro';
import CodeBlock from '@/components/ui/CodeBlock.astro';
import Badge from '@/components/ui/Badge.astro';

interface Props { /* static — no props */ }
const {} = Astro.props;
---

<Section id="problem-solution" padY="lg" bg="default">
  <Container>
    <!-- Header -->
    <!-- Two-column comparison grid -->
  </Container>
</Section>
```

## 2. Slot Composition

| Region | What it renders |
|---|---|
| `section-header` | Title "Define how vs. define done" |
| `col-left-header` | Badge "Imperative — define the steps" |
| `col-left-body` | CodeBlock with LangGraph-style DAG snippet |
| `col-right-header` | Badge "Declarative — define the done state" |
| `col-right-body` | CodeBlock with converge TASK.md snippet |

## 3. Tailwind Class Plan

- Section background: `bg-bg-elev` (from brand token via CSS var)
- Section title: `text-text` heading at `text-3xl font-bold`
- Grid: `grid grid-cols-1 md:grid-cols-2 gap-8`
- Column headers: `Badge` component with `variant="outline"` and `bg="indigo"` tokens
- Code blocks: `CodeBlock` component styled with `JetBrains Mono` from brand typography, syntax highlight for JS/TS
- Mobile: single column via `grid-cols-1`, stacked vertically

## 4. States

- Static only — no hover, focus, or scroll-triggered state changes
- `prefers-reduced-motion`: no animations to disable

## 5. Accessibility Plan

- `<section>` with `id="problem-solution"` and `aria-label`
- Each column is a `<div role="region" aria-labelledby="...">` with heading inside
- Heading level: `<h2>` for section title; `<h3>` for column headers
- Code blocks: `<pre><code>` inside region
- Focus order: natural tab order through interactive elements (none expected in static design)
- Contrast: `text-text` on `bg-bg-elev` must meet WCAG AA — verified via brand token audit

## 6. Mobile Breakpoints

- **< 640px**: `grid-cols-1` — left column stacks above right column
- **>= 640px**: `grid-cols-2` — side-by-side equal-width columns
- No other breakpoints needed for this section
