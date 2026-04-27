# Needs: 06-guides/006-read-the-journal

## Inputs

- `packages/core/src/journal/types.ts`
- `packages/core/src/journal/reader.ts`
- `.converge/journal`

## Expected Outputs

- `docs/guides/read-the-journal.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **shows-journal-path**: documents the journal location
- **shows-learn-md**: covers LEARN.md
- **shows-cat-or-jq**: shows shell debugging commands
- **word-count-ok**: 600-1500 words
