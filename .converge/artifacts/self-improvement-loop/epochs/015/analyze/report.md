# Selection Report: Epoch 15 — "Checks, Not Vibes"

**Selected finding:** `ai-checks-still-functional`
**Rejected:** `output-validation-skips-markdown`

---

## Selection Rationale

The selection rubric prioritizes findings by leverage:

1. **Correctness** — framework produces wrong results under this violation
2. **Prevention** — fixing makes an entire class of bugs impossible
3. **Determinism** — violation causes non-deterministic behavior
4. **Clarity** — violation obscures framework contract
5. **DX** — only if no higher-tier findings exist

### Why `ai-checks-still-functional` was selected

**Dimension: Correctness (tier 1).** The `Checks, Not Vibes` mental model states: "Shell commands verify correctness, not LLM judgment." Yet `find-gaps.ts` line 536 contains `if (check.type === 'ai')` — a fully functional branch that dispatches LLM calls through `ai-check.ts` (229 lines), constructs prompts, parses JSON responses, and reports results. The deprecation warning on lines 537-542 is non-blocking. Any playbook author can declare `type: ai` checks and they will execute today.

This is a Correctness violation because:
- The framework accepts and executes a check mode that directly contradicts its core principle
- The deprecation warning signals awareness of the violation but does not prevent it
- The framework produces results based on LLM judgment when it should only accept deterministic shell commands

**Leverage:** Making this change structurally enforces the mental model. After the fix, no AI check can execute — the violation becomes impossible, not just warned-about. This prevents the entire class of "LLM judges its own work" anti-patterns.

### Why `output-validation-skips-markdown` was rejected

**Dimension: Coverage (not in rubric).** `find-gaps.ts` lines 426-499 perform content validation only for `.png`, `.jpg`, `.html`, and `.json` outputs. `.md` files (the most common Converge output format) only get `existsSync`. An LLM writing an empty `.md` file passes output validation.

While this is a real gap with high severity, Coverage is not one of the rubric dimensions. The closest rubric tier would be Prevention (tier 2) or Clarity (tier 4), but Correctness (tier 1) always takes priority. This finding should be addressed in a future epoch.

---

## Anti-Repeat Verification

- **metrics.jsonl**: Only epoch 2 exists (model: "Blueprint vs Runtime"). "Checks, Not Vibes" has never been audited in any prior epoch. ✅
- **touched-files.jsonl**: Only epoch 2 entries. `packages/core/src/task/unit/find-gaps.ts` does not appear in any prior epoch. ✅
- **escalated.json**: Does not exist. ✅
- **Self-modification guard**: Target file is `packages/core/src/task/unit/find-gaps.ts` — not in `.converge/playbooks/self-improvement-loop/`. ✅

---

## Correction Design Summary

- **Test first:** `tests/check-rejects-ai-type.test.ts` — asserts that a task declaring `type: ai` in its checks fails at load time with a clear error
- **Code change:** `packages/core/src/task/unit/find-gaps.ts` — replace the AI check dispatch with a hard rejection
- **Risk:** High (removes a check type; deprecation period already served)
- **Migration:** Playbooks using `type: ai` must switch to shell-command checks