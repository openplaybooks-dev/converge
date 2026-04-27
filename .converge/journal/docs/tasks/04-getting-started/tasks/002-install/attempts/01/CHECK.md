# Checks: 04-getting-started/002-install

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## page-exists
**Description**: page exists
**Command**: `test -f docs/getting-started/install.md`

## page-frontmatter
**Description**: title + sources frontmatter
**Command**: `head -10 docs/getting-started/install.md | grep -q '^title:' && head -10 docs/getting-started/install.md | grep -q '^sources:'`

## shows-pnpm
**Description**: documents pnpm install
**Command**: `grep -qE 'pnpm\s+(add|install)' docs/getting-started/install.md`

## shows-verify-step
**Description**: documents how to verify install (version or help)
**Command**: `grep -qE 'converge\s+(--version|--help)' docs/getting-started/install.md`

## shows-env-vars
**Description**: mentions provider API key env vars
**Command**: `grep -qE 'API_KEY|ANTHROPIC|GEMINI|env' docs/getting-started/install.md`