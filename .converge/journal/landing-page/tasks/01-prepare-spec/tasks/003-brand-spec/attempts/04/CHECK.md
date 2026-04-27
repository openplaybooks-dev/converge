# Checks: 01-prepare-spec/003-brand-spec

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## brand-json-exists
**Description**: brand.json exists
**Command**: `test -f apps/landing/src/.content/brand.json`

## brand-json-valid
**Description**: brand.json is valid JSON
**Command**: `test -f apps/landing/src/.content/brand.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/src/.content/brand.json','utf8'))"`

## has-palette
**Description**: palette has at least 4 named colors
**Command**: `test -f apps/landing/src/.content/brand.json && node -e "const b=require('./apps/landing/src/.content/brand.json');const ok=b.palette&&Object.keys(b.palette).length>=4;process.exit(ok?0:1)"`

## has-tagline
**Description**: tagline matches canonical
**Command**: `test -f apps/landing/src/.content/brand.json && node -e "const b=require('./apps/landing/src/.content/brand.json');process.exit(b.tagline==='Define done. Converge gets there.'?0:1)"`

## has-voice
**Description**: voice has tone descriptors
**Command**: `test -f apps/landing/src/.content/brand.json && node -e "const b=require('./apps/landing/src/.content/brand.json');const ok=b.voice&&Array.isArray(b.voice.tone)&&b.voice.tone.length>=3;process.exit(ok?0:1)"`