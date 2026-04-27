# Needs: 04-getting-started/001-why-converge

## Inputs

- `README.md`
- `packages/core/src/index.ts`

## Expected Outputs

- `docs/getting-started/why-converge.md`

## Checks

- **page-exists**: page exists
- **page-has-frontmatter**: page has title + sources frontmatter
- **page-has-define-done**: page introduces the 'define done' framing
- **page-not-too-long**: page is <=600 words (under 3 min read)
- **page-not-too-short**: page is >=200 words (substantive)
