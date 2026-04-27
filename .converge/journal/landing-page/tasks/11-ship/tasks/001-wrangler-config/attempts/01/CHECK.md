# Checks: 11-ship/001-wrangler-config

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## verify-passed-exists
**Description**: phase 10 verify-passed marker exists (deploy gate)
**Command**: `test -f apps/landing/.verify-passed`

## wrangler-toml-exists
**Description**: wrangler.toml exists
**Command**: `test -f apps/landing/wrangler.toml`

## wrangler-has-project-name
**Description**: project name is converge-landing
**Command**: `test -f apps/landing/wrangler.toml && grep -qE "name\s*=\s*['\"]converge-landing['\"]" apps/landing/wrangler.toml`

## wrangler-has-output-dir
**Description**: pages_build_output_dir is set
**Command**: `test -f apps/landing/wrangler.toml && grep -qE "pages_build_output_dir\s*=" apps/landing/wrangler.toml`