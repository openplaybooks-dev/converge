---
id: 01-archive-existing
title: Phase 01 — Archive any pre-existing .claude/ files to .claude/_internal/
blocking: true
inputs:
  - .claude
outputs:
  - .claude/_internal
checks:
  - id: internal-dir-exists
    cmd: "mkdir -p .claude/_internal && test -d .claude/_internal"
    description: .claude/_internal/ directory exists (created idempotently)
  - id: no-legacy-files-at-.claude-root
    cmd: "test -d .claude && test ! -f .claude/brand-messaging.md && test ! -f .claude/converge-gtm.md && test ! -f .claude/comparisons.md && test ! -f .claude/comparison-matrix.md && test ! -f .claude/social-kit.md && test ! -f .claude/why-converge.md && test ! -f .claude/getting-started.md && test ! -f .claude/scaffolding.md && test ! -f .claude/FEATURE-DEVELOPMENT-ANALYSIS.md"
    description: no known-legacy markdown files remain at .claude/ root
  - id: no-legacy-dirs-at-.claude-root
    cmd: "test -d .claude && test ! -d .claude/blog && test ! -d .claude/cli && test ! -d .claude/playbooks"
    description: no known-legacy subdirectories remain at .claude/ root (blog, cli, playbooks moved to _internal)
---

# Archive any pre-existing .claude/ files

This playbook owns `.claude/` end-to-end. Pre-existing files that are
internal-leaning (marketing, GTM, brand, feature analysis) move to
`.claude/_internal/` so they're preserved but off the public surface.

The publicly-curated framework .claude (`.claude/getting-started/`, `.claude/guides/`,
`.claude/examples/`, etc.) get authored in later phases.

## Idempotent

This phase runs every time the playbook runs, but on fresh runs (where
the legacy files have already been archived) it should be a no-op. The
checks above verify the *terminal* state — legacy files absent from
`.claude/` root, `.claude/_internal/` present — not that anything was moved
this run.

## What to do on first run (legacy files present)

If any of the files listed below are still at `.claude/` root, move them
with `git mv` (preserves history). On re-runs, all of these will already
be archived; the task is a no-op.

### Files to archive

```
.claude/brand-messaging.md          → .claude/_internal/brand-messaging.md
.claude/converge-gtm.md             → .claude/_internal/converge-gtm.md
.claude/comparisons.md              → .claude/_internal/comparisons.md
.claude/comparison-matrix.md        → .claude/_internal/comparison-matrix.md
.claude/social-kit.md               → .claude/_internal/social-kit.md
.claude/FEATURE-DEVELOPMENT-ANALYSIS.md → .claude/_internal/FEATURE-DEVELOPMENT-ANALYSIS.md
.claude/why-converge.md             → .claude/_internal/why-converge.md
.claude/getting-started.md          → .claude/_internal/getting-started-v1.md
.claude/scaffolding.md              → .claude/_internal/scaffolding-v1.md
.claude/README.md                   → .claude/_internal/README-v1.md
```

### Subdirectories

Decide per directory:

- `.claude/adr/`       → **keep in place**. ADRs are reference material; the
  new `.claude/reference/adr/` will read from here.
- `.claude/v1/`        → **leave in place**. Already namespaced as legacy.
- `.claude/blog/`      → **move to `.claude/_internal/blog/`**. Blog posts live in
  the landing-page playbook, not framework .claude.
- `.claude/cli/`       → **move to `.claude/_internal/cli-v1/`**. New
  `.claude/reference/cli/` is generated fresh in `08-reference`.
- `.claude/playbooks/` → **move to `.claude/_internal/playbooks-v1/`**. New
  `.claude/guides/` covers playbook authoring.

## Process

1. `mkdir -p .claude/_internal` (idempotent).
2. For each file in the move list above: if present at `.claude/<name>`, run
   `git mv .claude/<name> .claude/_internal/<name>`. If already at `.claude/_internal/`,
   skip silently.
3. Same logic for the subdirectories.
4. Verify the top-level `.claude/` is clean: only `_internal/`, `adr/`, `v1/`,
   plus directories created by later phases (`getting-started/`, `examples/`,
   `guides/`, `troubleshooting/`, `reference/`, `concepts/`).

## Banned

- Deleting any file. Archive only — `git mv`, never `rm`.
- Re-archiving a file that's already in `.claude/_internal/`. The phase is
  idempotent; check before moving.
- Moving `.claude/adr/` or `.claude/v1/`. Both are referenced elsewhere or
  belong in `.claude/`.
- Editing the content of any archived file. Archive is byte-for-byte
  preservation; new content lives in fresh files in later phases.
