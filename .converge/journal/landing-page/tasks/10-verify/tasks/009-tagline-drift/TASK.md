---
id: 009-tagline-drift
title: Tagline in dist/index.html matches README.md byte-for-byte
dependencies: [001-build-clean]
outputs:
  - apps/landing/.verify-passed
checks:
  - id: tagline-drift
    cmd: "node .converge/playbooks/landing-page/scripts/check-tagline-drift.mjs"
    description: tagline string in landing matches README.md (canonical source)
  - id: verify-passed-marker
    cmd: "node .converge/playbooks/landing-page/scripts/check-tagline-drift.mjs && touch apps/landing/.verify-passed && test -f apps/landing/.verify-passed"
    description: tagline check passes AND .verify-passed marker is written
---

# Tagline drift

Run `check-tagline-drift.mjs` — confirms the canonical tagline appears
verbatim in both `README.md` (source of truth) and
`apps/landing/dist/index.html` (rendered).

If they disagree, the README is canonical: update the landing page (or
the brand.json that the hero reads) — never edit the README to match the
landing.

## Verify-passed marker

After this check passes, write `apps/landing/.verify-passed` — phase 11
(ship) reads this file and refuses to deploy without it. The marker
file is the gate; it's only written when ALL phase 10 checks have
already passed (because earlier tasks would have failed before reaching
this one).

## Banned

- Touching `.verify-passed` from any other task. Only this task writes it, and only after the tagline check passes.
- Editing the README to match the landing if they drift. README is canonical; landing follows.
