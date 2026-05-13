# Selection Report — Epoch 2

**Mental model audited:** Checks, Not Vibes
**Selected finding:** `existence-only-checks-for-most-file-types`

## Why this finding was chosen

This finding scored highest on the selection rubric:
- **Correctness (tier 1):** The framework produces wrong results — a task that writes an empty or malformed .md/.jsonl file passes output checks because only `existsSync()` is called. The framework claims success when the output is garbage.
- **Prevention (tier 2):** Extending content validation to .md and .jsonl prevents an entire class of bugs where tasks produce empty/broken output files silently. Once content checks are enforceable, playbook authors can specify contract-complete checks.

## Rejected findings

### `ai-checks-are-vibes` — REJECTED (lower rubric tier)

- **Dimension:** Determinism (tier 3)
- **Reason:** AI checks being non-deterministic is a real concern, but it doesn't produce *wrong* results — it produces *unreliable* results. This is a tier 3 concern (Determinism) vs. the selected finding's tier 1 (Correctness). Additionally, AI checks are an opt-in feature that playbook authors choose to use; the existence-only output checks affect every task by default with no opt-out. The blast radius of the correctness bug is larger.

### `empty-cmd-checks-pass-silently` — REJECTED (lowest rubric tier + low severity)

- **Dimension:** Robustness (not in rubric)
- **Reason:** This finding's dimension is "Robustness" which doesn't appear in the rubric at all. Severity is "low" — a mistyped check name is a playbook author error caught during development, not a silent production correctness issue. Fixing this would add a warning, not prevent wrong results.
