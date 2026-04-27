# Task: 01-prepare-spec/004-seo-spec

# SEO spec

Centralize all metadata in one JSON. The MainLayout (built in phase 05)
imports this and renders the right `<meta>` and `<link>` tags per route.

## Required shape

```json
{
  "site": {
    "title": "Converge — Define done. Converge gets there.",
    "titleTemplate": "%s — Converge",
    "description": "Open-source TypeScript framework for AI workflows. Goal-driven, deterministic, self-correcting.",
    "canonical": "https://converge.dev",
    "ogImage": "/og/default.png",
    "twitterHandle": "@convergeframework",
    "themeColor": "#0F1117",
    "locale": "en_US"
  },
  "pages": {
    "home": {
      "title": "Converge — Define done. Converge gets there.",
      "description": "Open-source TypeScript framework for AI workflows. Goal-driven, deterministic, self-correcting.",
      "ogImage": "/og/home.png"
    },
    "docs": {
      "title": "Docs",
      "description": "Install, configure, and run Converge — the goal-driven AI orchestration framework.",
      "ogImage": "/og/docs.png"
    },
    "blog": {
      "title": "Blog",
      "description": "Posts on goal-driven workflows, comparisons with step-driven frameworks, and lessons from the field.",
      "ogImage": "/og/blog.png"
    }
  }
}
```

## Process

1. Read `apps/landing/.content/brand.json` — `name`, `tagline`, `palette.bg` (themeColor) come from there.
2. Read `apps/landing/.content/sitemap.json` — verify `pages.*` keys cover the home/docs/blog routes listed.
3. Read `README.md` — the description should paraphrase the README's first paragraph; the `Why Converge?` bullets should not be referenced verbatim here (those are in feature grid copy, not SEO).
4. Write `apps/landing/.content/seo.json`.

## Banned

- `keywords` meta. Search engines stopped using it ~2009.
- Per-route titles that are identical to `site.title`. The site title is the fallback; per-route titles should be specific.
- Hardcoded brand strings that aren't in brand.json. If the title pattern changes, update brand.json first.