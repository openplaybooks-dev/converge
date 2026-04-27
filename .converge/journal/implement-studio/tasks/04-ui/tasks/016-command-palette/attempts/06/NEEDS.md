# Needs: 04-ui/016-command-palette

## Expected Outputs

- `packages/converge-studio/src/components/command-palette.tsx`
- `packages/converge-studio/src/app/api/search/route.ts`

## Checks

- **palette-component-exists**: CommandPalette component exists
- **search-api-exists**: /api/search returns combined results
- **palette-mounted-in-layout**: CommandPalette is mounted in layout.tsx (so Cmd-K works on every page)
- **typecheck-passes**: typecheck-passes
