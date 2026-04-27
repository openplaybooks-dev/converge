# Needs: 01-vendor/001-clone-prune

## Expected Outputs

- `packages/converge-studio/src/app`
- `packages/converge-studio/UPSTREAM_SHA`

## Checks

- **studio-dir-exists**: Studio package directory exists with Next.js app/ tree
- **prisma-removed**: No Prisma directory or @prisma deps
- **adapters-removed**: Framework-specific adapter dirs removed (openclaw/crewai/langgraph/autogen)
- **upstream-sha-pinned**: UPSTREAM_SHA file records the upstream commit
