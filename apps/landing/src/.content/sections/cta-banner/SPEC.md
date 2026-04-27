# Section Spec: cta-banner

## 1. Section ID + Title

- **id**: `cta-banner`
- **title**: `Get started`

## 2. Intent

Final conversion banner: tagline restated (`Define done. Converge gets there.`) + two CTAs (Read the docs → `/docs/getting-started`, Star on GitHub → `https://github.com/myanlabs/converge`). Subtle indigo glow background mirroring `banner.svg`.

## 3. Component

- **Name**: `CtaBanner`
- **Location**: `apps/landing/src/components/sections/CtaBanner.astro`
- **Framework**: Astro (static, no framework hydration needed)

## 4. Content Sources

| Source file | Used for |
|---|---|
| `apps/landing/.content/brand.json` | tagline (`Define done. Converge gets there.`), palette tokens, GitHub URL |
| `README.md` | CTA label copy ("Read the docs"), motivation copy for sub-tagline |

No other sources are valid for this section.

## 5. Required Props

None — `CtaBanner` renders a static section with no props.

## 6. Layout / States

Single static state. No tabs, no disclosure. Layout:

```
[Indigo glow background — var(--cv-indigo) at low opacity]
[Tagline — H2, display type, restating brand tagline]
[Sub-tagline — one-liner from brand voice]
[CTA row: primary button + secondary button]
```

- **Desktop**: centered, max-width ~700px
- **Mobile (320px+)**: stacked, full-width CTAs

## 7. Acceptance Criteria

- [ ] Renders `<h2>` containing the canonical tagline `Define done. Converge gets there.`
- [ ] No console errors on load
- [ ] Mobile responsive at 320px (CTA row stacks vertically)
- [ ] All visible copy traces to `brand.json` or `README.md` — no marketing-speak invented in this section
- [ ] All color values use brand tokens (e.g. `var(--cv-bg)`, `var(--cv-indigo)`) — no raw hex in component
- [ ] Indigo glow background uses `var(--cv-indigo)` at controlled opacity (no hardcoded `#6366F1` in component)
- [ ] Primary CTA: filled button linking to `/docs/getting-started`. Secondary CTA: ghost/outline button linking to GitHub. **Banned: two CTAs of equal visual weight.**

## 8. Banned

- Two CTAs of equal visual weight (primary + primary is banned; primary + secondary is required)
- Hardcoded hex colors (use brand tokens only)
- Invented copy not traceable to `brand.json` or `README.md`
- Background without indigo glow (must mirror the `banner.svg` aesthetic)
