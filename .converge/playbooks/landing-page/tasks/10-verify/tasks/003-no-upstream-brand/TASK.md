---
id: 003-no-upstream-brand
title: Zero references to ScrewFast / AstroWind / Foxi / AstroPaper / Astroship
dependencies: [001-build-clean]
checks:
  - id: no-upstream-brand
    cmd: "node .converge/playbooks/landing-page/scripts/check-no-upstream-brand.mjs"
    description: zero forked-theme brand strings in src/ or dist/
---

# No upstream-theme brand

The most direct check against v1's failure mode. Runs the
`check-no-upstream-brand.mjs` script which greps `apps/landing/src/`
and `apps/landing/dist/` for every known upstream Astro theme name.

If the build was truly fresh (phase 02-001-wipe + 02-002-scaffold-fresh
worked correctly), this is trivially clean. If anything leaked through,
the script lists every file:line so it's actionable.

## Process

```bash
node .converge/playbooks/landing-page/scripts/check-no-upstream-brand.mjs
```

Exit 0 = clean. Exit 1 = at least one match found, with file paths.

## Banned

- Adding any of the banned brand names back to satisfy "compatibility" or "credit". Attribution belongs in `LICENSE.upstream` (preserved from a fork) and `NOTICE` only — never in `src/` or `dist/`.
