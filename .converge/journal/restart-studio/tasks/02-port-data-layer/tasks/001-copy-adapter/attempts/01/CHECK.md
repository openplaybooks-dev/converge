# Checks: 02-port-data-layer/001-copy-adapter

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## adapter-files-present
**Description**: All 8 converge-adapter files exist
**Command**: `for f in paths playbooks tasks sessions watcher frontmatter schedule index; do test -f packages/studio/src/lib/converge-adapter/$f.ts || exit 1; done`