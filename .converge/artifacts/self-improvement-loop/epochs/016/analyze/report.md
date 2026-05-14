# Selection Report: Epoch 016 — Analyze Phase

## Selected Finding

**`hardcoded-github-repo-urls`** (severity: high, dimension: Abstraction)
- **File**: `packages/cli/src/commands-add.ts` line 615
- **Violation**: `downloadExampleFromGitHub()` hardcodes the specific GitHub organization (`myanlabs`) and repository name (`converge`) in URL construction, embedding project-specific identity into framework code.

## Selection Rationale

Applied rubric: Correctness → Prevention → Determinism → Clarity → DX

| Rank | Finding | Severity | Dimension | Rubric Level |
|------|---------|----------|-----------|-------------|
| 1 | `hardcoded-github-repo-urls` | high | Abstraction | **Correctness** — framework produces wrong results for non-myanlabs users |
| 2 | `stitch-names-in-jsdoc-examples` | medium | Leakage | **Clarity** — JSDoc examples use project-specific names, obscuring the framework's generic contract |
| 3 | `stitch-in-test-fixtures` | low | Leakage | **Clarity** — test fixture strings reference project-specific paths |

## Why Not the Alternatives

### Rejected: `stitch-names-in-jsdoc-examples`
- **Reason**: JSDoc examples are non-executable documentation. While they violate the "Framework vs Project" mental model, they do not cause incorrect behavior at runtime. A documentation-only cleanup is lower leverage than a correctness fix that enables the framework to work for any user.
- **Rubric level**: Clarity (#4) — fixing makes the contract clearer but doesn't prevent bugs.

### Rejected: `stitch-in-test-fixtures`
- **Reason**: Test fixture strings in health check templates are even lower impact than JSDoc. They exist only in test infrastructure, not production paths. Low severity confirms this is a cleanup task, not a correctness fix.
- **Rubric level**: Clarity (#4) — same dimension as above but lower severity.

## Anti-Repeat Verification

- **Mental model recency**: "Framework vs Project" was not audited in the last 2 epochs (epoch 14-15 used "Checks, Not Vibes" and "Blueprint vs Runtime"). ✓
- **Touched files**: `packages/cli/src/commands-add.ts` does not appear in `touched-files.jsonl` (no prior 3+ epoch churn). ✓
- **Escalated**: No `escalated.json` exists — nothing is escalated. ✓
- **Self-modification**: Finding does not target `.converge/playbooks/self-improvement-loop/`. ✓

## Correction Design

1. **Test first**: `tests/cli/commands-add-repo-config.test.ts` — validates that the download function is parameterized and accepts a configurable repo URL.
2. **Minimal code change**: `packages/cli/src/commands-add.ts` — parameterize the URL (via function parameter, env var, or CLI flag). One file, smallest possible diff.
3. **Risk**: Low — additive change (adds a parameter with a default), does not remove or rename any public API. No deprecation needed.
