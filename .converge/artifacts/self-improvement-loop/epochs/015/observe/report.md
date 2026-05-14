# Audit Report: "Checks, Not Vibes" — Epoch 15

**Model audited:** Checks, Not Vibes (model index 2)
**Source:** README ("Why Converge" section), CLAUDE.md §5
**Date:** 2026-05-14

---

## 1. What the Rule REQUIRES

**"Shell commands verify correctness, not LLM judgment."** Every task declares shell-command checks (`tsc`, `grep`, `eslint`, a test suite). The runtime loops until they pass. No LLM judging its own output.

From CLAUDE.md §5: "Contracts: TASK.md `outputs:` and `checks:` define done. Do not weaken checks to pass."

---

## 2. Implementation Trace

### Files audited

| File | Role |
|---|---|
| `packages/core/src/task/unit/find-gaps.ts` | Core gap detection: output existence checks, check execution, AI check dispatch |
| `packages/core/src/task/checks/ai-check.ts` | AI check runner: prompt construction, LLM invocation, JSON parsing |
| `packages/core/src/task/checks/types.ts` | Check/Plan/Eval function type definitions |
| `packages/core/src/task/checks/registry.ts` | Global function registry for checks |
| `packages/core/src/task/gap/types.ts` | Gap types including `GapKind.checkFailed`, `GapKind.output` |
| `packages/core/src/task/gap/detector.ts` | GapDetector: runs checks, builds EvalResult |

### Commands run

```
# Find all check-related code in core
grep -rn "check\|Check" packages/core/src/ packages/cli/src/ --include="*.ts" | grep -v "node_modules" | grep -v ".test.ts" | grep -v "checkpoint"

# Find AI check usage
grep -rn "type.*ai\|type:.*'ai'" packages/core/src/ packages/cli/src/ --include="*.ts" | grep -v "node_modules" | grep -v "\.test\.ts"

# Count existsSync calls in find-gaps.ts
grep -rn "existsSync" packages/core/src/task/unit/find-gaps.ts

# Trace output validation extensions (manual trace of ext-based switch, lines 426-499)
```

---

## 3. Findings

### Finding 1: AI check infrastructure contradicts "Checks, Not Vibes" (HIGH)

**File:** `packages/core/src/task/unit/find-gaps.ts`, lines 536–600

The `runCheck()` function has a fully functional `check.type === "ai"` branch that dispatches LLM calls to verify work. Despite the deprecation warning on line 537–542 (`"Checks, Not Vibes" violation... AI checks will be removed`), the code path is production-grade:

- Line 536: `if (check.type === "ai")` — gates the full AI check flow
- Line 544-548: dispatches to `runAiCheck()` from `ai-check.ts`
- Line 566-599: produces `check-failed` gaps with LLM feedback as `checkOutput`

Additionally, `packages/core/src/task/checks/ai-check.ts` (229 lines) is a fully maintained module with:
- Prompt construction (lines 97-149)
- LLM invocation via `createAIFactory` (line 186)
- JSON result parsing (lines 156-173)
- Timeout handling (line 204)
- Graceful degradation on missing config (lines 192-198)

**Gap:** The mental model says "no LLM judging its own output," but the framework accepts, dispatches, and reports on `type: "ai"` checks. The deprecation warning signals awareness of the violation but does not prevent it. A playbook author can declare `type: ai` checks today and they will execute.

### Finding 2: Output content validation skips `.md` and `.ts` files (HIGH)

**File:** `packages/core/src/task/unit/find-gaps.ts`, lines 426–499

Content validation (non-empty, parseable, structurally sound) is only performed for four extension groups:

| Extension | Validation |
|---|---|
| `.png` | Magic bytes, non-empty (ValidationRuleSets.png) |
| `.jpg`/`.jpeg` | Magic bytes, non-empty (custom JPEG rules) |
| `.html`/`.htm` | Well-formed HTML (ValidationRuleSets.html) |
| `.json` | Valid JSON (ValidationRuleSets.json) |

**Notably missing:** `.md` (the most common Converge output format), `.ts`, `.js`, `.txt`, `.css`, `.yaml`/`.yml`.

For these unvalidated extensions, the check is purely `existsSync` (line 389):
```
const outputExistsOnDisk = existsSync(absOutputPath);
```

An LLM that writes an empty `.md` file or a syntactically broken `.ts` file would pass the built-in output validation because the file merely exists on disk. The task's declared `checks:` are the only backstop.

**Gap:** The mental model says "shell commands verify correctness" but the built-in output validation performs only existence checks for the most frequently used output types. The framework relies entirely on playbook authors to add content-aware checks for `.md`, `.ts`, and other common outputs — there is no default content integrity guard.

---

## 4. Proposed Corrections

### For Finding 1: Remove AI check support entirely

**Test to write:** `tests/check-rejects-ai-type.test.ts` — assert that a task with `type: ai` in its checks list fails at compile/load time with a clear error, not at runtime with a warning.

**Code change:** In `resolveChecks()` (resolve.ts) or the declarative loader, reject any check with `type: "ai"` during task compilation. Remove the `ai-check.ts` module. The deprecation period is over — principle enforcement trumps backward compatibility.

**Why this prevents recurrence:** By failing at load time (not runtime), no AI check can silently execute. The framework enforces the principle structurally, not through convention.

### For Finding 2: Add default content validation for `.md` files

**Test to write:** `tests/output-content-validation.test.ts` — test that a task producing an empty `.md` output file generates a `corrupted-output` gap, not a pass.

**Code change:** Add a `ValidationRuleSets.markdown(output)` rule set in the facts module (non-empty + reasonable size > 0 bytes) and apply it in the `findGaps()` extension switch. At minimum, check that `.md` files are non-empty.

**Why this prevents recurrence:** A default content guard for the most common output format catches the empty-file regression without requiring every playbook author to remember to add `test -s report.md` as a check.
