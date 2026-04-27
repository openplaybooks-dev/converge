---
id: 006-lighthouse-a11y
title: Lighthouse Accessibility ≥ 95 on home page
dependencies: [001-build-clean]
checks:
  - id: lighthouse-a11y-95
    cmd: |
      pkill -9 -f "astro preview" 2>/dev/null; sleep 1
      cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
      PREVIEW_PID=$!
      sleep 6
      LH_URL=http://localhost:4321/ node /Users/minh/Documents/converge/.converge/playbooks/landing-page/scripts/lighthouse-gate.mjs accessibility 95
      RC=$?
      pkill -9 -f "astro preview" 2>/dev/null
      exit $RC
    description: Lighthouse Accessibility >= 95 on /
---

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
