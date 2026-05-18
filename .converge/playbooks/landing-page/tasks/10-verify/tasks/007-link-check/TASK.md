---
id: 007-link-check
title: lychee — zero broken internal links in dist/
dependencies: [001-build-clean]
checks:
  - id: link-check
    cmd: "test -d apps/landing/dist && (pnpm --filter @openplaybooks/landing exec lychee --no-progress --offline ./dist 2>&1 || pnpm --filter @openplaybooks/landing exec linkinator ./dist --recurse --silent --skip 'https?://' 2>&1)"
    description: internal link checker passes (skips external URLs — those are placeholders)
---

# Link check

Run lychee against `dist/` in offline mode (only checks internal links,
not external URLs — those would require network access and rate-limit
the run). Falls back to linkinator if lychee isn't available.

## Process

If lychee/linkinator aren't installed yet:

```bash
pnpm --filter @openplaybooks/landing add -D @lychee-org/lychee linkinator
```

Then run the check.

## Common breakages

- A `/docs/concepts/old-name` link that points to a renamed concept page.
- A `/blog/<slug>` link with the wrong slug.
- An anchor `/#hero-old-id` that doesn't match the actual section id.

The output shows every broken link with its source file — fix in source,
re-build, re-check.

## Banned

- Skipping with `--ignore` for "known broken" links. Either fix the link or remove it.
- Running in `--online` mode. External link rot isn't a build-time concern; check that in CI separately.
