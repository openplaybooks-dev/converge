# Section Spec: hero

## 1. Section ID + Title

- **id**: `hero`
- **title**: `Hero`

## 2. Intent

Tagline-first hero with the canonical tagline `Define done. Converge gets there.` (from `brand.json`), an animated convergence motif, and two CTAs: primary "Get started" → `/docs/getting-started` and secondary "Star on GitHub" → `https://github.com/myanlabs/converge`.

## 3. Component

- **Name**: `Hero`
- **Location**: `apps/landing/src/components/sections/Hero.astro`
- **Framework**: Astro (static, no framework hydration needed)

## 4. Content Sources

| Source file | Used for |
|---|---|
| `apps/landing/.content/brand.json` | tagline (`Define done. Converge gets there.`), palette tokens, motif keywords |
| `README.md` | hero tagline, "Why Converge?" bullet context for hero sub-text |

No other sources are valid for this section.

## 5. Required Props

None — `Hero` renders a static section with no props.

## 6. Layout / States

Single static state. No tabs, no disclosure. Layout:

```
[Animated convergence SVG motif]
[Tagline — H1, large display type]
[Sub-tagline — one-liner from brand voice]
[CTA row: primary + secondary button]
```

- **Desktop**: centered, max-width ~800px
- **Mobile (320px+)**: stacked, full-width CTAs

## 7. Acceptance Criteria

- [ ] Renders `<h1>` containing the canonical tagline `Define done. Converge gets there.`
- [ ] No console errors on load
- [ ] Mobile responsive at 320px (CTA row stacks vertically)
- [ ] All visible copy traces to `brand.json` or `README.md` — no marketing-speak invented in this section
- [ ] All color values use brand tokens (e.g. `var(--cv-bg)`, `var(--cv-indigo)`) — no raw hex in component
- [ ] Animated convergence motif loops smoothly (CSS animation, no JS)
- [ ] Primary CTA: filled button with `bg: var(--cv-indigo)`. Secondary CTA: ghost/outline button. **Banned: two CTAs of equal visual weight.**

## 8. Banned

- Two CTAs of equal visual weight (primary + primary is banned; primary + secondary is required)
- Hardcoded hex colors (use brand tokens only)
- Invented copy not traceable to `brand.json` or `README.md`
- JS-dependent animations (CSS only)