---
id: 005-lighthouse-perf
title: Lighthouse Performance ≥ 95 on home page
dependencies: [001-build-clean]
checks:
  - id: lighthouse-perf-95
    cmd: |
      pkill -9 -f "astro preview" 2>/dev/null; sleep 1
      cd apps/landing && pnpm preview > /tmp/converge-landing-preview.log 2>&1 &
      PREVIEW_PID=$!
      sleep 6
      LH_URL=http://localhost:4321/ node /Users/minh/Documents/converge/.converge/playbooks/landing-page/scripts/lighthouse-gate.mjs performance 95
      RC=$?
      pkill -9 -f "astro preview" 2>/dev/null
      exit $RC
    description: Lighthouse Performance >= 95 on /
---

# Lighthouse Performance ≥ 95

Spawn the preview server (built dist), run Lighthouse against `/` in
performance-only mode, parse the JSON report, exit 0 if score >= 95.

If this fails:
- Check if the hero animation is JS-heavy (it shouldn't be — phase 09's spec says CSS-only).
- Check if fonts are preloaded with `<link rel="preload">` for the variable Inter.
- Check if any image is missing `width`/`height` (causes CLS, hits perf).
- Check the network tab for unexpectedly large bundles.

The polish phase exists specifically to keep this metric green. If it
fails after polish, that's a real regression — investigate the cause,
don't lower the bar.

## Banned

- Lowering the threshold below 95. The bar is non-negotiable for v1 of "production ready".
- Using `--throttling-method=disabled` to fake-pass the score. Mobile-throttled is the default and what real users experience.
