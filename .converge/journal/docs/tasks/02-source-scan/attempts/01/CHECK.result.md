# RESULT.md — Attempt 1

**Outcome**: ✅ SUCCESS
**Duration**: 2m 44s
**Completed**: 2026-04-26T07:37:22.532Z

## Outputs

- `docs/_sources.json` — ✓ produced (6.4 KB)
- `docs/_cli-commands.json` — ✓ produced (3.1 KB)
- `docs/_examples.json` — ✓ produced (8.6 KB)

## Check Results — ✅ all passed

- ✓ **sources-json-exists**: docs/_sources.json exists and is valid JSON
- ✓ **sources-json-has-cli**: sources include CLI files
- ✓ **sources-json-has-core**: sources include @converge/core files
- ✓ **sources-json-has-troubleshooting**: sources include the troubleshooting reference file
- ✓ **cli-commands-extracted**: at least 10 CLI commands extracted by scan-cli-commands.mjs
- ✓ **examples-manifest-exists**: docs/_examples.json lists at least 15 examples with category and metadata
- ✓ **examples-have-required-fields**: every examples entry has slug, category, hasReadme, hasPlaybook
