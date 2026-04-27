# Task: 03-design-system/002-typography

# Typography

Self-host the two brand fonts (Inter + JetBrains Mono) and define the
type scale. Self-hosting avoids a render-blocking google fonts request
which costs ~200ms FCP.

## Process

```bash
pnpm --filter @converge/landing add @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

Then write:

### `apps/landing/src/styles/typography.css`

```css
/* Self-hosted brand fonts. Use the variable variant for fewer requests. */
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";

@layer base {
  html { font-family: 'Inter Variable', system-ui, sans-serif; }
  code, pre, kbd, samp { font-family: 'JetBrains Mono Variable', monospace; }

  h1 { font-size: var(--text-5xl, 3rem); line-height: 1.1;  font-weight: 700; letter-spacing: -0.02em; }
  h2 { font-size: var(--text-3xl, 1.875rem); line-height: 1.2; font-weight: 600; letter-spacing: -0.015em; }
  h3 { font-size: var(--text-xl, 1.25rem);  line-height: 1.3; font-weight: 600; }
  p, li { line-height: 1.6; }
  small { font-size: 0.875rem; color: var(--color-text-muted); }
}
```

### Update `apps/landing/src/styles/globals.css`

Add `@import "./typography.css";` after the tokens import.

## Banned

- Google Fonts via `<link href="fonts.googleapis.com">`. Self-hosted only.
- Loading the static (non-variable) variants. The variable fonts are 1 file each vs. 6+; uses ~80% less bandwidth.
- Re-declaring colors here. Colors live in tokens.css and are referenced via `var(--color-*)`.