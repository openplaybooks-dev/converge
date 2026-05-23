# Feature: CSS Design Tokens

**Epic:** design-system-foundation
**Classification:** System-level
**Priority:** Must (MVP)
**RICE:** Reach=100, Impact=3, Confidence=95%, Effort=3 → **Score: 9,500**

## Description

CSS custom properties (`--token-name`) for every visual primitive: color palette, typography scale, spacing units, elevation/shadow tokens, and motion curves. These tokens are the single source of truth consumed by all components. No component should hardcode a `#hex` value or `16px` spacing — everything references a token.

## Design Decisions

### Token Architecture

```
:root {
  /* Color Palette */
  --color-primary-50: #e3f2fd;
  --color-primary-500: #2196f3;
  --color-primary-900: #0d47a1;
  --color-neutral-0: #ffffff;
  --color-neutral-900: #1a1a2e;
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;

  /* Semantic Color Aliases */
  --bg-primary: var(--color-neutral-0);
  --bg-surface: var(--color-neutral-50);
  --text-primary: var(--color-neutral-900);
  --text-secondary: var(--color-neutral-600);
  --border-color: var(--color-neutral-200);

  /* Typography Scale */
  --font-family-base: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-base: 1.5;
  --line-height-relaxed: 1.75;

  /* Spacing Scale (4px base) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Elevation / Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);

  /* Borders */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
}

/* Dark mode overrides */
[data-theme="dark"] {
  --bg-primary: var(--color-neutral-900);
  --bg-surface: var(--color-neutral-800);
  --text-primary: var(--color-neutral-50);
  --text-secondary: var(--color-neutral-300);
  --border-color: var(--color-neutral-700);
}
```

### Two-Layer Token Model

1. **Primitive tokens** — raw values (colors, sizes, fonts) named by what they *are*
2. **Semantic tokens** — aliases named by what they *do* (`--bg-primary`, `--text-on-dark`)

Components consume semantic tokens only. This enables theme overrides without touching component CSS.

### Why CSS Custom Properties (not CSS-in-JS or SCSS variables)?

- **Runtime mutable** — dark mode is a single attribute toggle, no re-render
- **Zero build step** — no compilation, no toolchain dependency
- **Cascade-friendly** — can be scoped to component, page, or user preference
- **Industry standard** — aligns with Material Design 3, OpenUI, Style Dictionary

## MVP Scope

- [ ] Color palette (8-color scale with 50-900 variants for primary, neutral, success, warning, error)
- [ ] Semantic color aliases (bg, text, border tokens referencing palette)
- [ ] Typography scale (font families, 6 sizes, 3 weights, 3 line heights)
- [ ] Spacing scale (8-step, 4px base unit)
- [ ] Elevation tokens (4 shadow levels)
- [ ] Border radius tokens (5 levels)
- [ ] Dark mode variant for all semantic tokens
- [ ] Single CSS file (`tokens.css`) imported by all component stylesheets
- [ ] Token reference guide in documentation

## v2+ Scope

- Animation/motion tokens (duration curves, easing functions)
- Z-index scale tokens
- Design token JSON source with build pipeline (Style Dictionary or similar)
- Programmatic token API for JS consumption (e.g., `tokens.color.primary[500]`)
- Token usage audit (CI check for hardcoded values slipping in)
- Figma token sync (design-to-code parity)

## Verification

- **Automated**: CSS lint rule rejects `#hex` or `px` values in component stylesheets (allow list: `0`, `1px` borders)
- **Manual**: Open dev tools, verify no component CSS contains hardcoded colors/sizes — all use `var(--token-name)`
- **Visual**: Dark mode toggle swaps all surfaces/text correctly without layout shift

## Trade-offs

| Decision | Alternative | Why Chosen |
|---|---|---|
| CSS custom properties | SCSS variables, CSS-in-JS | Runtime mutable, zero build, cascade-friendly |
| Two-layer token model | Flat tokens | Enables theme overrides without component changes |
| 4px base unit | 8px base | Finer granularity for tight layouts; still divisible cleanly |
| All tokens in one file | Split by category | Simpler import, easier to audit, small enough for one file |
