# Checks: 07-integrate-blog/004-rss-feed

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## rss-route-exists
**Description**: rss.xml.ts route handler exists
**Command**: `test -f apps/landing/src/pages/rss.xml.ts`

## rss-uses-astrojs-rss
**Description**: uses @astrojs/rss helper
**Command**: `test -f apps/landing/src/pages/rss.xml.ts && grep -qE '@astrojs/rss' apps/landing/src/pages/rss.xml.ts`