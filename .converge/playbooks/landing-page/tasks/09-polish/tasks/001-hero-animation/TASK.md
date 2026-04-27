---
id: 001-hero-animation
title: ConvergenceJourney.astro — animated SVG hero hallmark
inputs:
  - apps/landing/src/icons/convergence-journey.svg
  - apps/landing/.content/brand.json
outputs:
  - apps/landing/src/components/animations/ConvergenceJourney.astro
checks:
  - id: animation-component-exists
    cmd: "test -f apps/landing/src/components/animations/ConvergenceJourney.astro"
    description: ConvergenceJourney.astro exists
  - id: animation-respects-reduced-motion
    cmd: "test -f apps/landing/src/components/animations/ConvergenceJourney.astro && grep -qE 'prefers-reduced-motion|prefersReducedMotion' apps/landing/src/components/animations/ConvergenceJourney.astro"
    description: respects prefers-reduced-motion
  - id: animation-uses-css-only
    cmd: "test -f apps/landing/src/components/animations/ConvergenceJourney.astro && ! grep -qE 'addEventListener|requestAnimationFrame|setInterval' apps/landing/src/components/animations/ConvergenceJourney.astro"
    description: animation is CSS-only (no JS) — keeps Lighthouse perf up
---

# ConvergenceJourney

The visual hallmark. SVG animation showing a few scattered dots
"converging" on a target — visualizes the framework's name. CSS-only
(no JS) so it doesn't cost Lighthouse perf or interactivity.

## Composition

- ViewBox 400×160 (matches the Hero section's intended aspect)
- 3-5 starting dots in `text-text-dim` color, scattered on the left
- Curved paths from each dot, animating their stroke-dashoffset to "draw" toward a center target on the right
- Target dot in `text-indigo`, slightly larger
- Animation loops every ~6 seconds
- `prefers-reduced-motion: reduce` → static SVG, no animation

## File

```astro
---
// apps/landing/src/components/animations/ConvergenceJourney.astro
---

<svg viewBox="0 0 400 160" class="convergence-journey w-full max-w-md mx-auto" aria-hidden="true" role="presentation">
  <defs>
    <radialGradient id="targetGlow">
      <stop offset="0%" stop-color="#6366F1" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- 5 starting dots (scattered on the left) -->
  <circle cx="40"  cy="40"  r="4" fill="#64748B" class="dot dot-1" />
  <circle cx="60"  cy="100" r="4" fill="#64748B" class="dot dot-2" />
  <circle cx="30"  cy="80"  r="4" fill="#64748B" class="dot dot-3" />
  <circle cx="80"  cy="50"  r="4" fill="#64748B" class="dot dot-4" />
  <circle cx="50"  cy="120" r="4" fill="#64748B" class="dot dot-5" />

  <!-- Curved paths from each starting dot to the target at (340, 80) -->
  <path d="M 40 40  Q 200 20  340 80"  stroke="#6366F1" stroke-width="1.5" fill="none" stroke-dasharray="400" stroke-dashoffset="400" class="path path-1" />
  <path d="M 60 100 Q 200 90  340 80"  stroke="#6366F1" stroke-width="1.5" fill="none" stroke-dasharray="400" stroke-dashoffset="400" class="path path-2" />
  <path d="M 30 80  Q 200 50  340 80"  stroke="#6366F1" stroke-width="1.5" fill="none" stroke-dasharray="400" stroke-dashoffset="400" class="path path-3" />
  <path d="M 80 50  Q 200 30  340 80"  stroke="#6366F1" stroke-width="1.5" fill="none" stroke-dasharray="400" stroke-dashoffset="400" class="path path-4" />
  <path d="M 50 120 Q 200 110 340 80"  stroke="#6366F1" stroke-width="1.5" fill="none" stroke-dasharray="400" stroke-dashoffset="400" class="path path-5" />

  <!-- Target with glow -->
  <circle cx="340" cy="80" r="20" fill="url(#targetGlow)" />
  <circle cx="340" cy="80" r="6" fill="#6366F1" class="target" />
</svg>

<style>
  .convergence-journey { display: block; }

  .path {
    animation: draw 6s ease-in-out infinite;
  }
  .path-1 { animation-delay: 0s; }
  .path-2 { animation-delay: 0.3s; }
  .path-3 { animation-delay: 0.6s; }
  .path-4 { animation-delay: 0.9s; }
  .path-5 { animation-delay: 1.2s; }

  .target {
    animation: pulse 6s ease-in-out infinite;
  }

  @keyframes draw {
    0%   { stroke-dashoffset: 400; opacity: 0.3; }
    40%  { stroke-dashoffset: 0;   opacity: 1; }
    70%  { stroke-dashoffset: 0;   opacity: 1; }
    100% { stroke-dashoffset: 400; opacity: 0.3; }
  }

  @keyframes pulse {
    0%, 100% { r: 6; }
    50%      { r: 8; }
  }

  @media (prefers-reduced-motion: reduce) {
    .path, .target { animation: none; }
    .path { stroke-dashoffset: 0; opacity: 1; }
  }
</style>
```

## Banned

- JS-driven animation. CSS-only keeps the bundle and Lighthouse-perf score safe.
- Animation that doesn't loop. The hero is the most-viewed surface; a one-shot animation feels broken on revisit.
- Hardcoded hex outside of inline SVG `fill`/`stroke` attributes (those are necessary because SVG elements can't reference CSS variables in older browsers without extra setup). Keep these matching the brand palette.
