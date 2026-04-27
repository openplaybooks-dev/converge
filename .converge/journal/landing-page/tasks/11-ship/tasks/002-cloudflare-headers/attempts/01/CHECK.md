# Checks: 11-ship/002-cloudflare-headers

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## headers-exists
**Description**: public/_headers exists
**Command**: `test -f apps/landing/public/_headers`

## has-csp
**Description**: has CSP or X-Frame-Options
**Command**: `test -f apps/landing/public/_headers && grep -qE 'Content-Security-Policy|X-Frame-Options' apps/landing/public/_headers`

## has-cache-control
**Description**: has Cache-Control directives
**Command**: `test -f apps/landing/public/_headers && grep -qE 'Cache-Control' apps/landing/public/_headers`