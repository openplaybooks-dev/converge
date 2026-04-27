# SPEC.md — Hero Section

## 1. Section ID + Title

- **ID**: `hero`
- **Title**: `Hero`

## 2. Intent

Tagline-first hero with the canonical tagline `"Define done. Converge gets there."`, an animated convergence motif, and two CTAs:

- **Primary**: `Get started` → `/docs/getting-started`
- **Secondary**: `Star on GitHub` → `https://github.com/myanlabs/converge`

## 3. Component Name

- `Hero` — lives at `apps/landing/src/components/sections/Hero.astro`

## 4. Content Sources

- **Tagline**: `apps/landing/.content/brand.json` — `tagline` field
- **Why Converge bullets**: `README.md` — `## Why Converge?` section (for subtext or supporting copy)
- No other sources for this section

## 5. Required Props

None — Hero is a static section with no dynamic props.

## 6. Layout / States

- **Layout**: Full-width, centered content column, max-width ~768px
- **Visual structure** (top to bottom):
  1. Eyebrow label (optional, e.g. "AI Orchestration")
  2. `<h1>` with canonical tagline
  3. Subtext sourced from README.md `## Why Converge?` bullets (1–2 sentences max)
  4. Animated convergence motif (CSS/SVG animated arrows or dots converging)
  5. Two CTA buttons side-by-side (primary indigo, secondary ghost/outline)
  6. GitHub star count badge (live from GitHub API or static placeholder)
- **States**: Static only — no interactive states beyond button hover

## 7. Acceptance Criteria

- [ ] Renders `<h1>` containing the canonical tagline from `brand.json`
- [ ] Both CTAs are present and link to correct destinations
- [ ] Animated convergence motif visible (CSS animation or inline SVG)
- [ ] All copy traces to a real source file (no invented marketing text)
- [ ] Uses brand palette tokens — no hardcoded hex values for colors
- [ ] Mobile responsive at 320px+ viewport width
- [ ] No console errors on load

## 8. Banned

- Two CTAs of equal visual weight — primary must be visually dominant
- Hardcoded color values instead of brand palette tokens
- Marketing-speak not sourced from listed content files
- The word "revolutionary" or "next-generation" (violates brand voice)
- Placeholder copy like "Your tagline here"

---

*Sources: `apps/landing/.content/brand.json`, `README.md`*