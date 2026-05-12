# Selection Report — Epoch 008

## Selected: `vitest-missing-at-root`

**Priority class:** Production Readiness (rank 4)
**Dimension:** Production Readiness

### Summary

The observation probe found that vitest is not installed at the project root. `pnpm vitest run tests/...` fails because root `package.json` lists only `prettier` and `sass` as devDependencies. The `vitest.config.ts` at root imports from `vitest/config` which cannot resolve. All `test_command` entries in `metrics.jsonl` for epochs 1-5 record this invocation pattern as passing, but none can execute today.

### Rejected alternatives

Only one finding was produced by observation: `vitest-missing-at-root`. No other candidates to reject.

### Priority ladder check (higher priorities confirmed clean)

1. **Failing test, crash, stalled run root cause** — No framework test crashes or stalled runs observed. The only test failure IS the vitest-not-found tooling gap being selected.
2. **State/lifecycle correctness** — No lifecycle findings observed. Cache invalidation, runstate/journal integrity, resume, locks, stop/clean are clean.
3. **DAG/seed determinism** — No determinism findings observed. Spawned child materialization, `--select`, incremental seed loops, parent completion are clean.
4. **Provider/runtime production readiness** ← **SELECTED** — vitest missing at root prevents any test regression verification.

### Anti-repeat validation

- Last two epochs: both dimension "Correctness" (epoch 4: duplicate-epochs fix, epoch 5: runstate-missing-crash). This selection is "Production Readiness" — different dimension.
- No candidate file (`package.json`, `vitest.config.ts`) appears in any entry of `touched-files.jsonl`.
- Not a cosmetic/DX-only change; not build-warning, unused-import, or formatting cleanup.

### Risk

**Low.** Adding a devDependency is a standard operation. Rollback is a single `pnpm install` re-run after removing the dependency line.
