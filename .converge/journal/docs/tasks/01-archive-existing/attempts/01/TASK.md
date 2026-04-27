# Task: 01-archive-existing

# Archive any pre-existing docs/ files

This playbook owns `docs/` end-to-end. Pre-existing files that are
internal-leaning (marketing, GTM, brand, feature analysis) move to
`docs/_internal/` so they're preserved but off the public surface.

The publicly-curated framework docs (`docs/getting-started/`, `docs/guides/`,
`docs/examples/`, etc.) get authored in later phases.

## Idempotent

This phase runs every time the playbook runs, but on fresh runs (where
the legacy files have already been archived) it should be a no-op. The
checks above verify the *terminal* state — legacy files absent from
`docs/` root, `docs/_internal/` present — not that anything was moved
this run.

## What to do on first run (legacy files present)

If any of the files listed below are still at `docs/` root, move them
with `git mv` (preserves history). On re-runs, all of these will already
be archived; the task is a no-op.

### Files to archive

```
docs/brand-messaging.md          → docs/_internal/brand-messaging.md
docs/converge-gtm.md             → docs/_internal/converge-gtm.md
docs/comparisons.md              → docs/_internal/comparisons.md
docs/comparison-matrix.md        → docs/_internal/comparison-matrix.md
docs/social-kit.md               → docs/_internal/social-kit.md
docs/FEATURE-DEVELOPMENT-ANALYSIS.md → docs/_internal/FEATURE-DEVELOPMENT-ANALYSIS.md
docs/why-converge.md             → docs/_internal/why-converge.md
docs/getting-started.md          → docs/_internal/getting-started-v1.md
docs/scaffolding.md              → docs/_internal/scaffolding-v1.md
docs/README.md                   → docs/_internal/README-v1.md
```

### Subdirectories

Decide per directory:

- `docs/adr/`       → **keep in place**. ADRs are reference material; the
  new `docs/reference/adr/` will read from here.
- `docs/v1/`        → **leave in place**. Already namespaced as legacy.
- `docs/blog/`      → **move to `docs/_internal/blog/`**. Blog posts live in
  the landing-page playbook, not framework docs.
- `docs/cli/`       → **move to `docs/_internal/cli-v1/`**. New
  `docs/reference/cli/` is generated fresh in `08-reference`.
- `docs/playbooks/` → **move to `docs/_internal/playbooks-v1/`**. New
  `docs/guides/` covers playbook authoring.

## Process

1. `mkdir -p docs/_internal` (idempotent).
2. For each file in the move list above: if present at `docs/<name>`, run
   `git mv docs/<name> docs/_internal/<name>`. If already at `docs/_internal/`,
   skip silently.
3. Same logic for the subdirectories.
4. Verify the top-level `docs/` is clean: only `_internal/`, `adr/`, `v1/`,
   plus directories created by later phases (`getting-started/`, `examples/`,
   `guides/`, `troubleshooting/`, `reference/`, `concepts/`).

## Banned

- Deleting any file. Archive only — `git mv`, never `rm`.
- Re-archiving a file that's already in `docs/_internal/`. The phase is
  idempotent; check before moving.
- Moving `docs/adr/` or `docs/v1/`. Both are referenced elsewhere or
  belong in `docs/`.
- Editing the content of any archived file. Archive is byte-for-byte
  preservation; new content lives in fresh files in later phases.