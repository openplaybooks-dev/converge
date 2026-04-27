# Needs: 11-index-and-redirects/001-index

## Inputs

- `docs/_ia.json`

## Expected Outputs

- `docs/index.md`

## Checks

- **page-exists**: page exists
- **links-to-getting-started**: links into Getting Started
- **links-to-examples**: links into Examples gallery
- **links-to-troubleshooting**: links into Troubleshooting
- **short**: <=500 words (it's a hub, not a topic)
