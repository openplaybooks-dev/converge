# Task: epoch-001/004-quality

# Quality gate

Verify no regressions were introduced in this epoch.

## Steps

1. Run `pnpm typecheck` — must pass with zero errors
2. Run `pnpm test` — all tests must pass
3. If either fails, fix the issues