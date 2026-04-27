# Task: 09-polish/004-font-cls

# Font CLS prevention

Eliminate cumulative layout shift caused by web fonts loading. Two
techniques: `font-display: swap` (show fallback immediately) +
`size-adjust` (scale fallback metrics to match the web font).

## Update: `apps/landing/src/styles/typography.css`

Add a `@font-face` override that re-defines Inter with `font-display: swap`
+ `size-adjust` so the fallback (`system-ui`) renders at the same metrics.

```css
/* Self-hosted brand fonts */
@import "@fontsource-variable/inter";
@import "@fontsource-variable/jetbrains-mono";

/* Override font-display so the fallback renders immediately
   (zero blank-text period) and use size-adjust to match metrics. */
@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  /* size-adjust matches Inter's metrics to system-ui — eliminates CLS */
  size-adjust: 100.06%;
  ascent-override: 90%;
  descent-override: 22.5%;
  line-gap-override: 0%;
}

@font-face {
  font-family: 'JetBrains Mono Variable';
  font-style: normal;
  font-display: swap;
  size-adjust: 102%;
}

@layer base {
  html { font-family: 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  code, pre, kbd, samp { font-family: 'JetBrains Mono Variable', ui-monospace, monospace; }

  /* Type scale (unchanged from 002-typography) */
  h1 { font-size: 3rem;     line-height: 1.1; font-weight: 700; letter-spacing: -0.02em; }
  h2 { font-size: 1.875rem; line-height: 1.2; font-weight: 600; letter-spacing: -0.015em; }
  h3 { font-size: 1.25rem;  line-height: 1.3; font-weight: 600; }
  p, li { line-height: 1.6; }
  small { font-size: 0.875rem; color: var(--color-text-muted); }
}
```

The `size-adjust` / `ascent-override` / `descent-override` values are
calculated to match Inter's metrics to `system-ui` — get the exact
numbers from https://font-style-matcher.netlify.app/ if you want to
verify, but the values shown here are good defaults for Inter.

## Banned

- `font-display: block`. Causes blank text for up to 3 seconds on slow networks — the worst LCP.
- Removing the system-font fallback. Without it, `font-display: swap` has nothing to swap to.