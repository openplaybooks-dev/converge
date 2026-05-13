# Verification Result — Epoch 2

**Result: PASS** | Mental Model: "Framework vs Project" | Finding: hardcoded-github-repo-in-cli

## Commands

| Command | Exit Code | Duration |
|---|---|---|
| `pnpm --filter @converge/cli build` | 0 | 7038ms |
| `pnpm --filter @converge/core build` | 0 | 9885ms |
| `pnpm vitest run tests/cli/examples-registry-config.test.ts` | 0 | 1532ms |

## Test Output

```
✓ tests/cli/examples-registry-config.test.ts (3 tests) 309ms
```

All 3 assertions pass:
1. Custom registry URL from project.yaml is used for example download ✓
2. CLI --registry flag overrides project.yaml setting ✓
3. Omission of registry config falls back to documented default ✓

## What changed

- `packages/cli/src/commands-add.ts` — replaced hardcoded `myanlabs/converge` URL with `readRegistryFromProject()` that reads `examples.registry.url` from project.yaml
- `tests/cli/examples-registry-config.test.ts` — new test that verifies the configurable registry behavior

## Mental model enforcement

The test proves the "Framework vs Project" boundary: the framework (packages/cli) no longer bakes in any project-specific org/repo identifier. Project-specific values live in project.yaml only.
