# Attempt 1 Failed

**2** of **4** checks did not pass.

## What Failed

### rendered-output-exists
Command: `test -f apps/landing/dist/index.html`
Exit code: 1

### section-id-rendered
Command: `test -f apps/landing/dist/index.html && grep -qE 'id="problem-solution"' apps/landing/dist/index.html`
Exit code: 1

## Passed

- ✓ build-succeeds
- ✓ passed-marker
