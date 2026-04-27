# Design: Converge vs. step-driven

## 1. Component skeleton

```astro
---
import Section from '@/components/layout/Section.astro';
import Container from '@/components/layout/Container.astro';
import Grid from '@/components/layout/Grid.astro';
import Button from '@/components/components/ui/Button.astro';
import Badge from '@/components/ui/Badge.astro';
import Card from '@/components/ui/Card.astro';
import CodeBlock from '@/components/ui/CodeBlock.astro';
import Disclosure from '@/components/ui/Disclosure.astro';

interface Props {}
const {} = Astro.props;

const activeTab = 'langgraph'; // 'langgraph' | 'converge'
---

<Section id="comparison" padY="lg" bg="bg">
  <Container>
    <!-- header region -->
    <!-- tab-bar region -->
    <!-- tab-panel region -->
    <!-- feature-matrix region -->
  </Container>
</Section>
```

## 2. Slot composition

| Region | What it renders |
|---|---|
| `header-eyebrow` | Badge — "Comparison" |
| `header-headline` | h2 — "Converge vs. step-driven" |
| `header-sub` | tagline from brand.json |
| `tab-langgraph` | tab trigger for LangGraph column |
| `tab-converge` | tab trigger for Converge column (visually emphasized) |
| `panel-langgraph` | CodeBlock with LangGraph imperative DAG example |
| `panel-converge` | CodeBlock with Converge declarative TASK.md example |
| `matrix-header` | table column headers (LangGraph / Converge) |
| `matrix-row-*` | each comparison dimension as a table row |

## 3. Tailwind class plan

| Region | Classes |
|---|---|
| Section | `bg-bg` (bg: #0F1117) |
| headline | `text-text text-3xl font-display` (text: #F8FAFC) |
| tagline | `text-textMuted text-lg` (textMuted: #94A3B8) |
| tab default | `text-textMuted border-border bg-bg` |
| tab active (langgraph) | `text-text border-border bg-bgElev` |
| tab active (converge) | `text-indigo border-indigo bg-bgElev` (indigo: #6366F1) |
| panel | `bg-bgElev border-border rounded` (bgElev: #1E293B, border: #1E293B) |
| table header | `text-textMuted text-sm uppercase tracking-wider` |
| table cell | `text-text text-base` |
| matrix row | `border-b border-border` |

## 4. States

- **Tab hover**: `bg-bgElev`, `border-border`
- **Tab focus**: `ring-2 ring-indigo ring-offset-2 ring-offset-bg`
- **Tab active**: bottom border accent, `bg-bgElev`
- **Converge tab**: always visually emphasized (indigo accent border)
- **Reduced motion**: disable tab transition animations via `prefers-reduced-motion`

## 5. Accessibility plan

- Tab list uses `role="tablist"`, each tab `role="tab"`, panels `role="tabpanel"`
- Arrow keys navigate tabs (left/right)
- Active tab has `aria-selected="true"`, others `false`
- Tab panels have `aria-labelledby` pointing to their tab
- Feature matrix uses `<table>` with `<thead>` and `scope="col"`
- Contrast: text (#F8FAFC) on bg (#0F1117) = 15.3:1 ✓

## 6. Mobile breakpoints (below 640px)

- Tabs collapse to `<select>` with `role="tablist"` / `role="option"` mapping
- Feature matrix scrolls horizontally via `overflow-x: auto` on the table wrapper
- Headline scales down to `text-2xl`
- Container uses full-width with `px-4`
