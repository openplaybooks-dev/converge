# Needs: 07-integrate-blog/003-post-template

## Inputs

- `apps/landing/src/content.config.ts`

## Expected Outputs

- `apps/landing/src/pages/blog/[slug].astro`

## Checks

- **post-template-exists**: blog/[slug].astro exists
- **post-uses-getStaticPaths**: uses getStaticPaths to enumerate slugs
- **post-renders-content**: renders post content via the entry's render() result
