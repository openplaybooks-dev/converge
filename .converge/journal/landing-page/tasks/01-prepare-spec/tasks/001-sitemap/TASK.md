---
id: 001-sitemap
title: Emit sitemap.json — every route the site will serve
inputs:
  - docs/_ia.json
  - README.md
outputs:
  - apps/landing/.content/sitemap.json
checks:
  - id: sitemap-json-exists
    cmd: "test -f apps/landing/.content/sitemap.json"
    description: sitemap.json exists
  - id: sitemap-valid-json
    cmd: "test -f apps/landing/.content/sitemap.json && node -e \"JSON.parse(require('fs').readFileSync('apps/landing/.content/sitemap.json','utf8'))\""
    description: sitemap.json is valid JSON
  - id: includes-home-and-docs
    cmd: "test -f apps/landing/.content/sitemap.json && node -e \"const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;const set=new Set(routes.map(x=>x.path||x));process.exit(set.has('/') && [...set].some(p=>p.startsWith('/docs/')) ? 0 : 1)\""
    description: includes / and at least one /docs/ route
  - id: includes-blog
    cmd: "test -f apps/landing/.content/sitemap.json && node -e \"const r=require('./apps/landing/.content/sitemap.json');const routes=r.routes||r;process.exit(routes.some(x=>(x.path||x)==='/blog') ? 0 : 1)\""
    description: includes /blog route
---

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
