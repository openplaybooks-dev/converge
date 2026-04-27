# SPEC.md — social-proof

## Section ID + Title

- **id**: `social-proof`
- **title**: `Trusted by builders`

## Intent

Lightweight credibility row: GitHub stars (live), npm downloads (live). Honest about being early — "Used by" not "Trusted by Fortune 500". Tone is direct and concrete, per the brand voice (direct, technical, honest-about-trade-offs).

## Component name

`SocialProof` — lives at `apps/landing/src/components/sections/SocialProof.astro`

## Content sources

- Live data: GitHub API (`https://api.github.com/repos/myanlabs/converge`) for star count
- Live data: npm registry (`https://api.npmjs.org/downloads/point/last-month/converge-cli`) for download count
- Static placeholder: when APIs are unavailable or rate-limited, display "GitHub stars" / "npm downloads" with a "-". Do not fake numbers.
- Brand source: `apps/landing/.content/brand.json` for tagline (`Define done. Converge gets there.`) and palette tokens

## Required props

None — this section is static and receives no props.

## Layout / States

- **Single state** — no interactive states
- Horizontal row of credibility metrics (GitHub stars + npm downloads)
- On mobile (320px+): metrics stack vertically, centered
- On desktop: metrics sit side-by-side with a subtle divider
- Background: uses `bgElev` token (`#1E293B`) to lift the section off the page background (`bg` = `#0F1117`)
- Text: primary uses `text` token (`#F8FAFC`), muted labels use `textMuted` (`#94A3B8`)

## Acceptance criteria

- [ ] Renders without console errors
- [ ] Mobile responsive at 320px+
- [ ] All copy traces to a real source (no marketing-speak hardcoded in component)
- [ ] Uses brand tokens for all colors — no hardcoded hex values in the component
- [ ] Gracefully degrades: if GitHub/npm APIs fail, shows "-" not a broken number
- [ ] Metrics are accurate to within 24h of page load (fresh data on each build)

## Banned

- Do not display logos of companies using Converge unless they have explicitly agreed to attribution
- Do not use "Trusted by Fortune 500" or similar — Converge is early-stage
- Do not hardcode star/download counts — must be fetched at build time
- No hardcoded color values; all colors must reference brand tokens from `brand.json`
