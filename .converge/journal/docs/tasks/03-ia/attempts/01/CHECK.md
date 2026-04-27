# Checks: 03-ia

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## ia-json-exists
**Description**: docs/_ia.json exists and is valid JSON
**Command**: `test -f docs/_ia.json && node -e "JSON.parse(require('fs').readFileSync('docs/_ia.json','utf8'))"`

## ia-has-six-groups
**Description**: IA has the six top-level groups (Getting Started, Examples, Guides, Troubleshooting, Reference, Concepts)
**Command**: `node -e "const ia=require('./docs/_ia.json');const labels=ia.groups.map(g=>g.label);const required=['Getting Started','Examples','Guides','Troubleshooting','Reference','Concepts'];process.exit(required.every(r=>labels.includes(r))?0:1)"`

## ia-getting-started-has-5-pages
**Description**: Getting Started has exactly 5 pages
**Command**: `node -e "const ia=require('./docs/_ia.json');const gs=ia.groups.find(g=>g.label==='Getting Started');process.exit(Array.isArray(gs.pages)&&gs.pages.length===5?0:1)"`

## ia-examples-has-glob
**Description**: Examples uses a glob entry for per-example pages
**Command**: `node -e "const ia=require('./docs/_ia.json');const ex=ia.groups.find(g=>g.label==='Examples');const hasGlob=(ex.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('examples/'));process.exit(hasGlob?0:1)"`

## ia-troubleshooting-has-glob
**Description**: Troubleshooting uses a glob entry for per-symptom pages
**Command**: `node -e "const ia=require('./docs/_ia.json');const t=ia.groups.find(g=>g.label==='Troubleshooting');const hasGlob=(t.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('troubleshooting/'));process.exit(hasGlob?0:1)"`

## ia-reference-has-cli-glob
**Description**: Reference uses a glob entry for CLI commands
**Command**: `node -e "const ia=require('./docs/_ia.json');const ref=ia.groups.find(g=>g.label==='Reference');const hasCliGlob=(ref.pages||[]).some(p=>p.kind==='glob'&&String(p.glob||'').startsWith('reference/cli/'));process.exit(hasCliGlob?0:1)"`

## ia-every-page-has-slug-or-glob
**Description**: every page entry has either slug or glob
**Command**: `node -e "const ia=require('./docs/_ia.json');const allPages=ia.groups.flatMap(g=>g.pages||[]);const ok=allPages.every(p=>p.slug||p.glob);process.exit(ok?0:1)"`