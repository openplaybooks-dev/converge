# Checks: 03-design-system/001-extract-tokens

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## tokens-json-exists
**Description**: tokens.json exists and is valid JSON
**Command**: `test -f apps/landing/src/styles/tokens.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/src/styles/tokens.json','utf8'))"`

## tokens-css-exists
**Description**: tokens.css exists
**Command**: `test -f apps/landing/src/styles/tokens.css`

## palette-keys
**Description**: tokens.json has at least bg/indigo/text/accent colors
**Command**: `test -f apps/landing/src/styles/tokens.json && node -e "const t=require('./apps/landing/src/styles/tokens.json');const ok=t.color&&['bg','indigo','text','accent'].every(k=>t.color[k]);process.exit(ok?0:1)"`

## tokens-css-has-variables
**Description**: tokens.css defines at least 3 color custom properties
**Command**: `test -f apps/landing/src/styles/tokens.css && grep -qE -- '--color-(bg|indigo|text)' apps/landing/src/styles/tokens.css`

## globals-imports-tokens
**Description**: globals.css imports tokens.css
**Command**: `test -f apps/landing/src/styles/globals.css && grep -qE "@import.*tokens\.css|@import.*['\"]\./tokens" apps/landing/src/styles/globals.css`