# Needs: 03-ia

## Inputs

- `docs/_sources.json`
- `docs/_cli-commands.json`
- `docs/_examples.json`

## Expected Outputs

- `docs/_ia.json`

## Checks

- **ia-json-exists**: docs/_ia.json exists and is valid JSON
- **ia-has-six-groups**: IA has the six top-level groups (Getting Started, Examples, Guides, Troubleshooting, Reference, Concepts)
- **ia-getting-started-has-5-pages**: Getting Started has exactly 5 pages
- **ia-examples-has-glob**: Examples uses a glob entry for per-example pages
- **ia-troubleshooting-has-glob**: Troubleshooting uses a glob entry for per-symptom pages
- **ia-reference-has-cli-glob**: Reference uses a glob entry for CLI commands
- **ia-every-page-has-slug-or-glob**: every page entry has either slug or glob
