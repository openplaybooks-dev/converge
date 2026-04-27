# Needs: 07-integrate-blog/002-listing-page

## Inputs

- `apps/landing/src/content.config.ts`

## Expected Outputs

- `apps/landing/src/pages/blog/index.astro`

## Checks

- **blog-index-exists**: blog/index.astro exists
- **blog-index-uses-getCollection**: uses getCollection('blog')
- **blog-index-uses-mainlayout**: wraps in MainLayout
