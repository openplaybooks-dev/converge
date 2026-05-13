# Audit: Checks, Not Vibes (Epoch 002)

**Model rule:** Shell commands verify correctness, not LLM judgment.
**Source:** CLAUDE.md §5 (Converge Implementation Rules), README
**Audited model:** Checks, Not Vibes (model_index: 2)

## What the model REQUIRES

CLAUDE.md §5 Contract line: "TASK.md `outputs:` and `checks:` define done. Do not weaken
checks to pass." The mental model encoded as "Checks, Not Vibes" extends this: correctness
is verified by deterministic shell commands (exit 0 = pass, exit != 0 = fail), not by LLM
judgment.

## Files audited

- `packages/core/src/task/unit/find-gaps.ts` — gap detection and check execution
- `packages/core/src/task/checks/ai-check.ts` — AI-based ("vibes") check runner
- `packages/core/src/navigator/core/actions/preflight/check-outputs-exist.ts` — preflight output existence
- `packages/core/src/task/facts/api.ts` — Facts API validation rules
- `packages/core/src/task/gap/types.ts` — gap type definitions

## Commands run

```sh
# Find all check/validation patterns in framework code
grep -rn "findGaps\|runCheck\|existsSync.*output" packages/core/src/ | head -40

# Find AI/vibes check references
grep -rn "type.*ai.*check\|runAiCheck\|ai-check" packages/core/src/ | head -20

# Find what extensions get content validation
grep -rn "ext ===\|\.json\|\.png\|\.md" packages/core/src/task/unit/find-gaps.ts

# Count file types that get content validation vs existence-only
grep -c "validateFile\|existsSync" packages/core/src/task/unit/find-gaps.ts
```

## Findings summary

### Finding 1: Most output types get existence-only checks (HIGH)

At `find-gaps.ts:387-389`, output verification for any file type other than `.png`,
`.jpg`, `.jpeg`, `.html`, `.htm`, or `.json` only calls `existsSync(absOutputPath)`.
Content validation (format, schema, non-empty) is only applied to those six extensions
(lines 428-476). `.md`, `.jsonl`, `.txt`, `.js`, `.ts` files pass checks even if empty
or malformed. This violates "Checks, Not Vibes" — the framework asserts "done" based on
mere existence, not verified correctness.

### Finding 2: AI checks are literal vibes (MEDIUM)

`packages/core/src/task/checks/ai-check.ts` implements `type: "ai"` checks that delegate
to an LLM to verify a natural-language assertion. This is the definition of "vibes" —
a non-deterministic, subjective AI judgment replacing a deterministic shell command.
The mental model explicitly states "Shell commands verify correctness, not LLM judgment."
While AI checks can be pragmatically useful for fuzzy assertions, they should require an
explicit override (e.g., `type: "ai"` requiring project AI config).

### Finding 3: Empty cmd checks silently pass (LOW)

At `find-gaps.ts:596-598`, when a check has no `cmd` field and is not `type: "ai"`,
`runCheck()` returns `{ passed: true, gaps: [] }` — no-op checks pass silently.
A mistyped or empty check definition succeeds without any warning.

## Correction proposed

For Finding 1 (highest impact): Add a `content` validation rule for `.md` and `.jsonl`
outputs that at minimum enforces non-empty files. Better: allow check definitions in
`checks:` to specify expected content patterns (jq schema, grep pattern, line count range)
so playbook authors can define what "done" means beyond existence.
