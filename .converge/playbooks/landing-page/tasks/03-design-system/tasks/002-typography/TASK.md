---
id: 002-typography
title: Self-host Inter + JetBrains Mono and define the type scale
dependencies: [001-extract-tokens]
inputs:
  - apps/landing/src/styles/tokens.css
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/src/styles/typography.css
  - apps/landing/package.json
checks:
  - id: fontsource-inter-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@fontsource-variable/inter']||all['@fontsource/inter']?0:1)\""
    description: Inter font package is installed
  - id: fontsource-jetbrains-installed
    cmd: "test -f apps/landing/package.json && node -e \"const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@fontsource-variable/jetbrains-mono']||all['@fontsource/jetbrains-mono']?0:1)\""
    description: JetBrains Mono font package is installed
  - id: typography-css-exists
    cmd: "test -f apps/landing/src/styles/typography.css"
    description: src/styles/typography.css exists
  - id: typography-imports-fonts
    cmd: "test -f apps/landing/src/styles/typography.css && grep -qE 'fontsource|@import.*inter' apps/landing/src/styles/typography.css"
    description: typography.css imports the font packages
  - id: globals-imports-typography
    cmd: "test -f apps/landing/src/styles/globals.css && grep -q 'typography.css' apps/landing/src/styles/globals.css"
    description: globals.css imports typography.css
---

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
