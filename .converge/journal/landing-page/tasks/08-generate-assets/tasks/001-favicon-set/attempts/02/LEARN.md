# Attempt 2 Failed

**3** of **4** checks did not pass.

## What Failed

### apple-touch-icon-exists
Command: `test -f apps/landing/public/apple-touch-icon.png`
Exit code: 1

### webmanifest-exists
Command: `test -f apps/landing/public/site.webmanifest && node -e "JSON.parse(require('fs').readFileSync('apps/landing/public/site.webmanifest','utf8'))"`
Exit code: 1

### webmanifest-has-name
Command: `test -f apps/landing/public/site.webmanifest && node -e "const m=require('./apps/landing/public/site.webmanifest');process.exit(m.name==='Converge'?0:1)"`
Exit code: 1

## Passed

- ✓ favicon-svg-exists
