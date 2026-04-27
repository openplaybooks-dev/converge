# Checks: 06-integrate-docs/001-starlight-mount

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## starlight-in-config
**Description**: astro.config.mjs imports + uses starlight()
**Command**: `test -f apps/landing/astro.config.mjs && grep -qE '@astrojs/starlight' apps/landing/astro.config.mjs`

## starlight-installed
**Description**: @astrojs/starlight is installed
**Command**: `test -d apps/landing/node_modules/@astrojs/starlight`