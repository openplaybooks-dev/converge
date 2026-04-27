# Checks: 01-prepare-spec/002-sections-inventory

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## sections-json-exists
**Description**: sections.json exists
**Command**: `test -f apps/landing/.content/sections.json`

## sections-json-valid
**Description**: sections.json is valid JSON
**Command**: `test -f apps/landing/.content/sections.json && node -e "JSON.parse(require('fs').readFileSync('apps/landing/.content/sections.json','utf8'))"`

## sections-count
**Description**: at least 8 sections defined
**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s.length>=8?0:1)"`

## sections-have-required-fields
**Description**: every section has id, title, componentName, intent
**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;const ok=s.every(x=>x.id&&x.title&&x.componentName&&x.intent);process.exit(ok?0:1)"`

## hero-first
**Description**: first section is hero
**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[0].id==='hero'?0:1)"`

## cta-last
**Description**: last section is cta-banner
**Command**: `test -f apps/landing/.content/sections.json && node -e "const r=require('./apps/landing/.content/sections.json');const s=Array.isArray(r)?r:r.sections;process.exit(s[s.length-1].id==='cta-banner'?0:1)"`