# Needs: 07-integrate-blog/001-collection-schema

## Inputs

- `apps/landing/src/content.config.ts`

## Expected Outputs

- `apps/landing/src/content.config.ts`

## Checks

- **blog-collection-defined**: src/content.config.ts defines a blog collection
- **schema-uses-zod**: schema uses zod fields
- **blog-content-dir-exists**: src/content/blog/ directory exists (empty is fine, seed posts come later)
- **build-still-clean**: build still passes with the new collection
