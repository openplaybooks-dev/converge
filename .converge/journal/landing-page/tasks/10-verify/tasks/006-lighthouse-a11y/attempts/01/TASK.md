# Task: 10-verify/006-lighthouse-a11y

# Lighthouse Accessibility ≥ 95

Same shape as the perf check, different category.

Common things that lower a11y:
- Missing `alt` attributes on `<img>` (Image.astro requires it — but a `prose` MDX may not)
- Insufficient color contrast (≥ 4.5:1 for body text)
- Form inputs without labels (we don't have forms on home — should be 100 here)
- Heading hierarchy (h1 → h2 → h3, no skipped levels)
- Buttons / links without accessible names

Phase 03's base components establish good defaults; this verifies they
were used.

## Banned

- Adding ARIA where semantic HTML works. `<button>` is better than `<div role="button">` every time.
- Lowering the threshold. Accessibility is not optional.