# Selection Report — Epoch 002 Analyze

## Selected: `hardcoded-github-repo-in-cli`

**Finding:** `packages/cli/src/commands-add.ts:615` hardcodes `myanlabs/converge` as the GitHub org/repo for downloading examples. This violates the Framework vs Project boundary — project-specific identifiers must not leak into `packages/`.

**Selection tier:** Correctness (tier 1) — the framework produces broken results for any fork or mirror.

**Leverage:** Fixing this prevents the entire class of "hardcoded identifiers leak into framework" bugs from recurring. The fix pattern (read from config, fall back to documented default) is reusable across other framework code.

## Rejected

| Finding | Reason |
|---|---|
| `hardcoded-converge-skills-path-in-core` | Medium severity, Flexibility dimension. The skill path string template in spawn-runner duplicates logic from the resolver but does not produce wrong results. A resolver already exists; the code still functions correctly. Lower leverage than the selected finding. |

## Anti-repeat verification

- **Mental model:** "Framework vs Project" does not appear in the last 2 epochs (Blueprint vs Runtime, Checks Not Vibes).
- **Touched files:** No file appears in 3+ epochs.
- **Escalated:** Neither finding matches escalated entries.
