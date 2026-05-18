---
id: 004-tailwind-init
title: Initialize Tailwind config + global styles from brand.json
dependencies: [003-install-integrations]
inputs:
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/tailwind.config.mjs
  - apps/landing/src/styles/globals.css
checks:
  - id: tailwind-config-exists
    cmd: "test -f apps/landing/tailwind.config.mjs"
    description: tailwind.config.mjs exists
  - id: globals-css-exists
    cmd: "test -f apps/landing/src/styles/globals.css"
    description: src/styles/globals.css exists
  - id: globals-imports-tailwind
    cmd: "test -f apps/landing/src/styles/globals.css && grep -qE '@import\\s+\"tailwindcss\"|@tailwind\\s+(base|components|utilities)' apps/landing/src/styles/globals.css"
    description: globals.css imports tailwind (v3 @tailwind or v4 @import)
  - id: tailwind-content-includes-src
    cmd: "test -f apps/landing/tailwind.config.mjs && grep -qE \"src/.*astro|src/.*\\\\{astro\" apps/landing/tailwind.config.mjs"
    description: tailwind.config content paths include src/**/*.astro
  - id: theme-uses-brand-palette
    cmd: "test -f apps/landing/tailwind.config.mjs && test -f apps/landing/.content/brand.json && grep -qE 'indigo|6366F1' apps/landing/tailwind.config.mjs"
    description: tailwind theme references brand palette colors
---

# Tailwind init

Wire Tailwind to read from `apps/landing/.content/brand.json` so the
palette + typography defined there flow through to every component.

## Files

### `apps/landing/tailwind.config.mjs`

```js
import brand from './.content/brand.json' with { type: 'json' };

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,ts,jsx,tsx,md,mdx,svelte,vue}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        brand.palette.bg,
        bgElev:    brand.palette.bgElev,
        indigo:    brand.palette.indigo,
        cyan:      brand.palette.cyan,
        violet:    brand.palette.violet,
        text:      brand.palette.text,
        textMuted: brand.palette.textMuted,
        textDim:   brand.palette.textDim,
        accent:    brand.palette.accent,
        border:    brand.palette.border,
      },
      fontFamily: {
        sans: [brand.typography.body, 'system-ui', 'sans-serif'],
        mono: [brand.typography.mono, 'monospace'],
        display: [brand.typography.display, 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### `apps/landing/src/styles/globals.css` (Tailwind v4)

```css
@import "tailwindcss";

@layer base {
  html { font-family: theme(fontFamily.sans); -webkit-font-smoothing: antialiased; }
  body { background-color: theme(colors.bg); color: theme(colors.text); }
  :focus-visible { outline: 2px solid theme(colors.indigo); outline-offset: 2px; }
}
```

(If the integrations task installed Tailwind v3 via `@astrojs/tailwind`,
use `@tailwind base; @tailwind components; @tailwind utilities;` instead
of the `@import "tailwindcss"` line.)

## Process

1. Read `apps/landing/.content/brand.json` to confirm the palette is in scope.
2. Write `tailwind.config.mjs` with the palette + typography pulled in via JSON import.
3. Write `src/styles/globals.css` with the imports + minimal base layer.
4. Verify by running `pnpm --filter @openplaybooks/landing astro check` — no Tailwind errors.

## Banned

- Hardcoding colors in `tailwind.config.mjs`. Read them from brand.json so a brand update flows through one file.
- Adding `@apply` rules in `globals.css` for arbitrary components. Keep base only — components own their own styles.
- Loading Tailwind in `astro.config.mjs` AND in `globals.css`. Pick one — for v4 it's `globals.css`; for v3 it's the `@astrojs/tailwind` integration in astro.config.
