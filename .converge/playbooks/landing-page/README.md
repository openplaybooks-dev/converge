# landing-page (v2)

Builds the public Converge landing page at `apps/landing/` — marketing site +
Starlight `/docs` + content-collection `/blog`, deployed to Cloudflare Pages.

**v2 is a from-scratch rewrite.** v1 used fork-and-prune (clone an MIT theme,
prune demo content, rebrand) and produced a broken page after 5 hours: leftover
ScrewFast strings, undeleted demo dirs, layout never rebranded. v2 throws that
model out — phase 02 wipes `apps/landing/src/` and scaffolds Astro fresh.
Nothing inherits from a forked theme.

| Phase | Purpose |
|---|---|
| `01-prepare-spec` | Sitemap, sections inventory, brand spec, SEO spec |
| `02-bootstrap-astro` | Wipe apps/landing/src/, `npm create astro@latest`, install integrations |
| `03-design-system` | Tokens from banner.svg, typography, base components, layout primitives, icons |
| `04-build-sections` | **WBS** — 8 sections × 5 steps (spec → design → build → integrate → verify) |
| `05-build-layout` | MainLayout, Header, Footer, Head/SEO, error pages |
| `06-integrate-docs` | Starlight `/docs/*` reads `docs/` directly via docsLoader |
| `07-integrate-blog` | Content collection schema, listing, post template, RSS, OG, 2 seed posts |
| `08-generate-assets` | Favicon set, default OG image, social cards |
| `09-polish` | Hero animation, scroll reveals, image opt, font-CLS swap |
| `10-verify` | Build clean + dev smoke + Lighthouse 95+ + link check + meta + brand audit |
| `11-ship` | wrangler.toml, headers, deploy preview, launch checklist |

Run with: `converge .converge/playbooks/landing-page/playbook.yml run --max-iterations 250`

## Inputs (read-only)

The `docs` playbook owns `docs/`. This playbook is a pure consumer.

- `banner.svg` — canonical visual identity
- `README.md` — canonical project intro, tagline, voice
- `docs/` — live published docs (rendered at `/docs/*` via Starlight `docsLoader`)
- `docs/_ia.json` — Starlight sidebar manifest
- `docs/_redirects.json` — legacy aliases, merged into Cloudflare `_redirects`
- `docs/concepts/*.md` — 4 framework concepts; trade-offs sections seed the FAQ
- `docs/getting-started/why-converge.md` — positioning + audience framing

## Output

`apps/landing/` — Astro app, ready to deploy on Cloudflare Pages.

## Production-ready gate

Phase 11 (ship) blocks on phase 10 (verify). Phase 10 enforces:

- `pnpm build` succeeds
- Dev server returns 200 with the canonical tagline
- Zero references to upstream theme brands (ScrewFast, AstroWind, Foxi, AstroPaper, Astroship)
- Zero placeholder strings (Lorem, TBD, FIXME, TODO:) in the built site
- Lighthouse Performance ≥ 95 on `/`
- Lighthouse Accessibility ≥ 95 on `/`
- Lychee link check finds zero broken internal links
- OG/Twitter/canonical/lang meta tags all present
- Tagline matches `README.md` byte-for-byte

If any one fails, the playbook fails. There is no "close enough" path to ship.

## Reset before re-running

```bash
converge reset landing-page
rm -rf apps/landing/src apps/landing/.content apps/landing/astro.config.* apps/landing/tsconfig.json
```

This is normal — the playbook is designed to be re-runnable from scratch when
the framework, docs, or brand spec change.
