# Task: 03-design-system/004-layout-primitives

# Layout primitives

Four primitives in `src/components/layout/`. Every section uses these
instead of reimplementing padding/max-width logic.

## Components

### `Container.astro`
Caps page width at the breakpoints we use. Default `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`. Slot for content.

### `Section.astro`
Wraps a section with vertical padding and an optional bg variant.
Props: `id` (anchor), `padY` (`md` | `lg` | `xl`), `bg` (`default` | `elev` | `gradient`).
Renders `<section id={id} class="...">{slot}</section>`. The `id` prop is what enables `/#hero`-style deep links.

### `Grid.astro`
Responsive column layout. Props: `cols` (number 1–4 or object like `{ base: 1, md: 2, lg: 3 }`), `gap` (`sm` | `md` | `lg`).
Used by FeatureGrid for 3×2 layout.

### `Spacer.astro`
Vertical gap. Props: `size` (token from `space-N`). Renders `<div class="h-{size}">`. Use sparingly — prefer Section's padY.

## Process

1. Write each `.astro` file with TS prop types + Tailwind classes referencing brand tokens.
2. Run `astro check` to verify.

## Banned

- Re-doing max-width logic outside `Container`. If a section needs a wider container, add a prop to Container, don't write it inline.
- Margin-collapsing tricks. Use Section's padY consistently.