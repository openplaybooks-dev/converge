# Task: 10-verify/009-tagline-drift

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