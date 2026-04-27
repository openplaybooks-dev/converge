# Needs: 04-build-sections/003-03-build

## Description

Build the ProblemSolution.astro component from SPEC + DESIGN, with real copy from source files.

## Inputs

- `apps/landing/.content/sections/problem-solution/SPEC.md`
- `apps/landing/.content/sections/problem-solution/DESIGN.md`
- `README.md`
- `docs/concepts`

## Expected Outputs

- `apps/landing/src/components/sections/ProblemSolution.astro`

## Checks

- **component-exists**: ProblemSolution.astro was created
- **component-uses-section-wrapper**: component uses <Section> layout primitive
- **component-typecheck**: astro check passes for this component
- **no-hardcoded-hex**: no hardcoded hex colors (use brand tokens via Tailwind classes)
- **no-placeholders**: no placeholder copy
