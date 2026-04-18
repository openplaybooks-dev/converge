# Checks: 02-docs/003-root-readme

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## readme-exists
**Description**: README.md exists
**Command**: `test -f README.md`

## readme-has-quickstart
**Description**: README has quick start section
**Command**: `grep -q 'Quick Start\|Getting Started\|quickstart' README.md`

## readme-has-badges
**Description**: README has badges
**Command**: `grep -q '\[!\[' README.md || grep -q 'badge' README.md`

## readme-has-banner-ref
**Description**: README references banner.svg
**Command**: `grep -q 'banner.svg' README.md`