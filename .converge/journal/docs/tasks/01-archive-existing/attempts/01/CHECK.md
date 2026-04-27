# Checks: 01-archive-existing

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## internal-dir-exists
**Description**: docs/_internal/ directory exists (created idempotently)
**Command**: `mkdir -p docs/_internal && test -d docs/_internal`

## no-legacy-files-at-docs-root
**Description**: no known-legacy markdown files remain at docs/ root
**Command**: `test ! -f docs/brand-messaging.md && test ! -f docs/converge-gtm.md && test ! -f docs/comparisons.md && test ! -f docs/comparison-matrix.md && test ! -f docs/social-kit.md && test ! -f docs/why-converge.md && test ! -f docs/getting-started.md && test ! -f docs/scaffolding.md && test ! -f docs/FEATURE-DEVELOPMENT-ANALYSIS.md`

## no-legacy-dirs-at-docs-root
**Description**: no known-legacy subdirectories remain at docs/ root (blog, cli, playbooks moved to _internal)
**Command**: `test ! -d docs/blog && test ! -d docs/cli && test ! -d docs/playbooks`