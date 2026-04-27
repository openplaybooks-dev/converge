# Checks: 01-vendor/003-license-notice

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## upstream-license-preserved
**Description**: LICENSE.upstream is the original Mission Control LICENSE
**Command**: `test -f packages/converge-studio/LICENSE.upstream && grep -qi 'MIT' packages/converge-studio/LICENSE.upstream`

## notice-attribution
**Description**: NOTICE file mentions builderz-labs/mission-control and includes upstream SHA
**Command**: `test -f packages/converge-studio/NOTICE && grep -qi 'mission-control' packages/converge-studio/NOTICE && grep -qE '[0-9a-f]{7,40}' packages/converge-studio/NOTICE`

## studio-license-mit
**Description**: Root LICENSE is MIT
**Command**: `test -f packages/converge-studio/LICENSE && grep -qi 'MIT' packages/converge-studio/LICENSE`

## readme-mentions-fork
**Description**: README.md documents the fork lineage
**Command**: `test -f packages/converge-studio/README.md && grep -qi 'mission-control' packages/converge-studio/README.md`