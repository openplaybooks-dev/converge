# Checks: 06-integrate-docs/002-sidebar-from-ia

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## ia-json-exists
**Description**: docs/_ia.json exists (owned by docs playbook)
**Command**: `test -f docs/_ia.json`

## content-config-exists
**Description**: src/content.config.ts exists
**Command**: `test -f apps/landing/src/content.config.ts`

## docs-loader-configured
**Description**: content.config.ts uses docsLoader from Starlight
**Command**: `test -f apps/landing/src/content.config.ts && grep -qE 'docsLoader|docsSchema' apps/landing/src/content.config.ts`

## sidebar-references-ia
**Description**: astro.config.mjs imports/reads docs/_ia.json
**Command**: `test -f apps/landing/astro.config.mjs && grep -qE 'docs/_ia\.json|_ia\.json' apps/landing/astro.config.mjs`