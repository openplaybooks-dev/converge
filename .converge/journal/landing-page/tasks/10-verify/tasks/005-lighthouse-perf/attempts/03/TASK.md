# Task: 10-verify/005-lighthouse-perf

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