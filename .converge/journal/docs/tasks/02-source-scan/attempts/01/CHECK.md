# Checks: 02-source-scan

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## sources-json-exists
**Description**: docs/_sources.json exists and is valid JSON
**Command**: `test -f docs/_sources.json && node -e "JSON.parse(require('fs').readFileSync('docs/_sources.json','utf8'))"`

## sources-json-has-cli
**Description**: sources include CLI files
**Command**: `node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.cli)&&s.cli.length>0?0:1)"`

## sources-json-has-core
**Description**: sources include @converge/core files
**Command**: `node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.core)&&s.core.length>0?0:1)"`

## sources-json-has-troubleshooting
**Description**: sources include the troubleshooting reference file
**Command**: `node -e "const s=require('./docs/_sources.json');process.exit(Array.isArray(s.troubleshooting)&&s.troubleshooting.length>0?0:1)"`

## cli-commands-extracted
**Description**: at least 10 CLI commands extracted by scan-cli-commands.mjs
**Command**: `test -f docs/_cli-commands.json && node -e "const c=require('./docs/_cli-commands.json');process.exit(c.length>=10?0:1)"`

## examples-manifest-exists
**Description**: docs/_examples.json lists at least 15 examples with category and metadata
**Command**: `test -f docs/_examples.json && node -e "const e=JSON.parse(require('fs').readFileSync('docs/_examples.json','utf8'));process.exit(Array.isArray(e)&&e.length>=15?0:1)"`

## examples-have-required-fields
**Description**: every examples entry has slug, category, hasReadme, hasPlaybook
**Command**: `node -e "const e=JSON.parse(require('fs').readFileSync('./docs/_examples.json','utf8'));const ok=e.every(x=>x.slug&&x.category&&typeof x.hasReadme==='boolean'&&typeof x.hasPlaybook==='boolean');process.exit(ok?0:1)"`