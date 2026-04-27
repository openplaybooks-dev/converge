# Task: 03-design-system/005-iconography

# Iconography

Three deliverables:

1. **Lucide icon set** — install `astro-icon` + `@iconify-json/lucide` so any component can `<Icon name="lucide:check" />` without per-icon imports.
2. **`converge-mark.svg`** — the brand monogram. Extract from `banner.svg` (the wordmark + logo glyph). Used in Header, Footer, OG images.
3. **`convergence-journey.svg`** — placeholder for the hero animation (phase 09 polishes this into the actual animation). For now: a static SVG showing 3–5 dots converging on a target.

## Process

```bash
pnpm --filter @converge/landing add astro-icon @iconify-json/lucide
```

Then write:

### `apps/landing/src/components/ui/Icon.astro`
Wraps `<Icon>` from `astro-icon/components`. Adds default `aria-hidden="true"` if no `aria-label` is passed.

### `apps/landing/src/icons/converge-mark.svg`
The Converge brand mark. Extract the SVG paths from `banner.svg` (the small mark, not the full banner). Should be ~24×24 viewBox.

### `apps/landing/src/icons/convergence-journey.svg`
A simple SVG: 3 starting dots on the left, an arrow / paths converging to a single target on the right. Viewbox 400×160. Static for now; phase 09 may animate paths via `<animate>` or replace with a more elaborate component.

## Banned

- Bringing in the full Heroicons OR Phosphor icon sets too. Lucide alone is the choice — avoid bloating the bundle.
- Inline SVG copy-paste into components. Use the `<Icon>` wrapper everywhere so a future global change (color, stroke-width) is one diff.