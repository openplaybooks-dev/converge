# Needs: 01-prepare-requirements/006-enrich-screens-html-reference

## Description

Read reference analysis and add htmlReference to each screen entry in screens.json

## Inputs

- `.stitch/references/ANALYSIS.md`
- `.stitch/screens.json`

## Expected Outputs

- `.stitch/screens.json`

## Checks

- **screens-json-valid**: screens.json is valid JSON
- **screens-json-html-reference-field**: Every screen entry has string htmlReference
