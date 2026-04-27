# Checks: 10-verify/009-tagline-drift

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## tagline-drift
**Description**: tagline string in landing matches README.md (canonical source)
**Command**: `node .converge/playbooks/landing-page/scripts/check-tagline-drift.mjs`

## verify-passed-marker
**Description**: tagline check passes AND .verify-passed marker is written
**Command**: `node .converge/playbooks/landing-page/scripts/check-tagline-drift.mjs && touch apps/landing/.verify-passed && test -f apps/landing/.verify-passed`