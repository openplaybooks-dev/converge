# Needs: 04-build-sections/002-03-build

## Description

Build the SocialProof.astro component from SPEC + DESIGN, with real copy from source files.

## Inputs

- `apps/landing/.content/sections/social-proof/SPEC.md`
- `apps/landing/.content/sections/social-proof/DESIGN.md`
- `README.md`
- `docs/concepts`

## Expected Outputs

- `apps/landing/src/components/sections/SocialProof.astro`

## Checks

- **component-exists**: SocialProof.astro was created
- **component-uses-section-wrapper**: component uses <Section> layout primitive
- **component-typecheck**: astro check passes for this component
- **no-hardcoded-hex**: no hardcoded hex colors (use brand tokens via Tailwind classes)
- **no-placeholders**: no placeholder copy
