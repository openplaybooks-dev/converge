---
id: 004-launch-checklist
title: Emit LAUNCH-CHECKLIST.md — manual post-deploy verification steps
dependencies: [003-deploy-preview]
inputs:
  - apps/landing/.preview-deploy-url
outputs:
  - apps/landing/LAUNCH-CHECKLIST.md
checks:
  - id: checklist-exists
    cmd: "test -f apps/landing/LAUNCH-CHECKLIST.md"
    description: LAUNCH-CHECKLIST.md exists
  - id: checklist-references-preview-url
    cmd: "test -f apps/landing/LAUNCH-CHECKLIST.md && grep -qE 'pages\\.dev' apps/landing/LAUNCH-CHECKLIST.md"
    description: checklist includes the preview URL
---

# Launch checklist

A markdown file with manual post-deploy verification steps. After the
playbook completes, a human runs through this list before promoting
the preview to production.

## File template

```markdown
# Launch checklist — Converge landing

## Preview deploy
- Preview URL: <PASTE FROM apps/landing/.preview-deploy-url>

## Pre-flight (automated by playbook)
- [x] Build clean (no warnings)
- [x] Dev server returns 200 with canonical tagline
- [x] Zero references to upstream theme brands (ScrewFast/AstroWind/etc.)
- [x] Zero placeholder strings in dist/
- [x] Lighthouse Performance ≥ 95 on home
- [x] Lighthouse Accessibility ≥ 95 on home
- [x] Lychee link check passes
- [x] OG / Twitter / canonical / lang meta tags all present
- [x] Tagline matches README.md

## Manual verification on preview URL
- [ ] Hero loads with the convergence-journey animation playing
- [ ] All 8 sections render in order (hero → social-proof → problem-solution → feature-grid → comparison → quickstart → faq → cta-banner)
- [ ] /docs/ loads with the IA from docs/_ia.json
- [ ] /docs/concepts/context-interpolation loads correctly
- [ ] /blog renders with both seed posts
- [ ] /blog/introducing-converge renders
- [ ] /rss.xml validates: https://validator.w3.org/feed/?url=<preview-url>/rss.xml
- [ ] /robots.txt is present and well-formed
- [ ] /sitemap.xml is present and lists all routes
- [ ] OG card renders correctly when shared on:
  - [ ] Twitter / X (https://cards-dev.twitter.com/validator)
  - [ ] LinkedIn (https://www.linkedin.com/post-inspector/)
  - [ ] Facebook (https://developers.facebook.com/tools/debug/)
- [ ] Pagefind search works on /docs/* (try a query)
- [ ] Mobile view (Chrome DevTools, iPhone SE 320px width) — no horizontal scroll, all sections legible

## Production deploy (manual)
- [ ] Cloudflare Pages project is created (`converge-landing`)
- [ ] CF_PAGES_BRANCH=main is set on the production environment
- [ ] DNS pointed to converge-landing.pages.dev (CNAME on the apex)
- [ ] HTTPS active (auto via Cloudflare)
- [ ] Production deploy from main branch
- [ ] Submit sitemap to Google Search Console
- [ ] Verify domain on Bing Webmaster Tools
- [ ] (Optional) Update GitHub repo description / link to point at converge.dev
```

## Process

1. Read `apps/landing/.preview-deploy-url`.
2. Write the file with the template above, substituting the preview URL.

## Banned

- Promoting to production from the playbook. The "manual" section is intentional — DNS changes need human eyes, not autonomy.
