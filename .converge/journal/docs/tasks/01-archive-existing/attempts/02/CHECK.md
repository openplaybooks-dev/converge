# Checks: 01-archive-existing

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## internal-dir-exists
**Description**: .claude/_internal/ directory exists (created idempotently)
**Command**: `mkdir -p .claude/_internal && test -d .claude/_internal`

## no-legacy-files-at-.claude-root
**Description**: no known-legacy markdown files remain at .claude/ root
**Command**: `test ! -f .claude/brand-messaging.md && test ! -f .claude/converge-gtm.md && test ! -f .claude/comparisons.md && test ! -f .claude/comparison-matrix.md && test ! -f .claude/social-kit.md && test ! -f .claude/why-converge.md && test ! -f .claude/getting-started.md && test ! -f .claude/scaffolding.md && test ! -f .claude/FEATURE-DEVELOPMENT-ANALYSIS.md`

## no-legacy-dirs-at-.claude-root
**Description**: no known-legacy subdirectories remain at .claude/ root (blog, cli, playbooks moved to _internal)
**Command**: `test ! -d .claude/blog && test ! -d .claude/cli && test ! -d .claude/playbooks`