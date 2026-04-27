# Task: 01-prepare-spec/001-sitemap

# Sitemap

Read `docs/_ia.json` to enumerate every doc route. Combine with the
canonical site routes (`/`, `/blog`, `/404`) to produce
`apps/landing/.content/sitemap.json`.

## Required shape

```json
{
  "$schema": "../.content/schemas/sitemap.schema.json",
  "domain": "https://converge.dev",
  "routes": [
    { "path": "/",                          "kind": "page",  "title": "Home",                 "priority": 1.0 },
    { "path": "/blog",                      "kind": "page",  "title": "Blog",                 "priority": 0.7 },
    { "path": "/blog/[slug]",               "kind": "dynamic","title": "Blog post",           "priority": 0.6 },
    { "path": "/docs/getting-started/why-converge", "kind": "doc", "title": "Why Converge",   "priority": 0.9 },
    { "path": "/docs/concepts/context-interpolation", "kind": "doc", "title": "Context interpolation", "priority": 0.8 },
    { "path": "/404",                       "kind": "error", "title": "Not found",             "priority": 0.1 }
  ]
}
```

`priority` follows the standard sitemap.xml convention (0.0–1.0). Home is
1.0; landing-relevant docs are ≥ 0.8; error pages are 0.1.

## Process

1. Read `docs/_ia.json`. For each `pages: [...]` entry under each `groups: [...]`, emit a route at `/docs/<slug>`.
2. Add the four canonical site routes (`/`, `/blog`, `/blog/[slug]`, `/404`).
3. Write the JSON file. The `domain` field is `https://converge.dev` — this is the canonical production URL.

## Banned

- Hardcoding doc routes that aren't in `docs/_ia.json`. The IA is the source of truth; if a route is missing here, fix `docs/_ia.json` first.
- Adding routes that don't exist (e.g. `/pricing`, `/about`). The site is a single landing page + docs + blog. No marketing-bloat routes.