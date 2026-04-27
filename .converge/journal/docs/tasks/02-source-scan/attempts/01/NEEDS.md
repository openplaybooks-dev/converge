# Needs: 02-source-scan

## Inputs

- `packages`
- `examples`
- `skills/converge-control/troubleshooting/playbook.md`
- `README.md`
- `CHANGELOG.md`

## Expected Outputs

- `docs/_sources.json`
- `docs/_cli-commands.json`
- `docs/_examples.json`

## Checks

- **sources-json-exists**: docs/_sources.json exists and is valid JSON
- **sources-json-has-cli**: sources include CLI files
- **sources-json-has-core**: sources include @converge/core files
- **sources-json-has-troubleshooting**: sources include the troubleshooting reference file
- **cli-commands-extracted**: at least 10 CLI commands extracted by scan-cli-commands.mjs
- **examples-manifest-exists**: docs/_examples.json lists at least 15 examples with category and metadata
- **examples-have-required-fields**: every examples entry has slug, category, hasReadme, hasPlaybook
