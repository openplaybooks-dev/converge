# Needs: 05-examples/001-gallery-hub

## Inputs

- `docs/_examples.json`

## Expected Outputs

- `docs/examples/index.md`

## Checks

- **page-exists**: page exists
- **has-frontmatter**: title + sources frontmatter
- **groups-by-category**: page is grouped by category headings
- **lists-most-examples**: lists at least 15 example links
- **not-too-long**: <=1500 words (the hub is scannable, not exhaustive)
