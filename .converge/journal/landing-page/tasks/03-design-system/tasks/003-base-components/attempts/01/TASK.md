# Task: 03-design-system/003-base-components

# Base components

Six primitives in `src/components/ui/`. Every section component in phase
04 imports from here. Section components must NOT reimplement these.

## Components

### `Button.astro`
Props: `variant` (`primary` | `secondary` | `ghost`), `size` (`sm` | `md` | `lg`), `href` (renders as `<a>` if set), `external` (adds `target="_blank" rel="noopener"`).
- `primary`: filled bg-indigo, white text, hover scale
- `secondary`: bordered, transparent bg, indigo text
- `ghost`: no border, just text + hover bg-bgElev

### `Badge.astro`
Props: `variant` (`info` | `success` | `warning` | `accent`), `size` (`sm` | `md`).
A small inline pill — typically used for "NEW" or "Beta" labels.

### `Card.astro`
Props: `padding` (`md` | `lg`), `bg` (`default` | `elev`).
Slot for content. Used by FeatureGrid for each card cell.

### `CodeBlock.astro`
Props: `language` (`bash` | `typescript` | `python` | `yaml` | `markdown`), `filename` (optional, renders as a tab), `copyable` (default true).
Uses Astro's built-in shiki for syntax highlighting (no client JS needed for highlighting itself; the copy button is a small island).

### `Pill.astro`
Props: `href` (optional). Smaller than Badge, used for inline links / filter pills.

### `Disclosure.astro`
Props: `id` (anchor), `open` (default false). Wraps `<details><summary>...</summary><div>...</div></details>`. Used by FAQ.

## Process

1. Create each `.astro` file with frontmatter (TS prop types) + template.
2. Use Tailwind classes referencing the brand tokens (`bg-indigo`, `text-text`, etc.) — never raw hex.
3. Run `pnpm --filter @converge/landing astro check` to verify TS validates.

## Banned

- React/Vue/Svelte components in `ui/`. Pure Astro only — these primitives must work without client JS.
- Hardcoded colors in any of these files. Use Tailwind classes that reference brand tokens.
- Variants beyond what's specified. If a section needs a new variant, add it here (one place, one diff) — don't fork the component.