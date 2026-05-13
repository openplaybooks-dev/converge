---
id: "{{taskId}}"
title: "Audit framework mental model — epoch {{epoch}}"
outputs:
  - "{{artifactsRel}}/observe/report.md"
  - "{{artifactsRel}}/observe/findings.json"
checks:
  - id: report-written
    cmd: "test -s {{artifactsRel}}/observe/report.md"
    description: Audit report exists
  - id: findings-valid
    cmd: "jq empty {{artifactsRel}}/observe/findings.json"
    description: Findings JSON is valid
  - id: has-actionable-finding
    cmd: "jq -e '(.findings | length >= 1) and (.findings[0].file != \"\") and (.findings[0].line != \"\")' {{artifactsRel}}/observe/findings.json"
    description: At least one finding with specific file:line evidence
  - id: mental-model-identified
    cmd: "jq -e '.mental_model != \"\"' {{artifactsRel}}/observe/findings.json"
    description: The audited mental model is named
---

# Audit one framework mental model

Read `{{artifactsRel}}/mental-model/selection.json` — the mental model to audit
has already been selected. You audit ONLY that model. Do not pick a different one.

Read the relevant section from `{{projectDir}}/CLAUDE.md` or `{{projectDir}}/AGENTS.md`
for the full text of the rule. Trace it through the code. Find gaps. Produce evidence.

## ⛔ PROHIBITED

- Do NOT edit files under `.converge/playbooks/self-improvement-loop/`
- Do NOT propose cosmetic fixes (unused imports, formatting, help text)
- Do NOT switch to a different mental model — audit the one in selection.json

## Audit method

### Step 1: Read the mental model
Read the relevant section from CLAUDE.md or AGENTS.md. State what the rule
REQUIRES in one sentence.

### Step 2: Trace the implementation
Find every file in `packages/core/src/` and `packages/cli/src/` that implements
or interacts with this mental model. Read them. Run commands to gather evidence:

```sh
cd {{projectDir}}

# For model 3 (Framework vs Project) — find project-specific leaks:
grep -rn "\.converge/" packages/core/src/ packages/cli/src/ | grep -v "node_modules" | head -20
grep -rn "examples/" packages/core/src/ packages/cli/src/ | head -10

# For model 6 (Source of Truth) — count escape hatches:
grep -rn "as any\|@ts-ignore" packages/core/src/ packages/cli/src/ | wc -l
grep -rn "as any\|@ts-ignore" packages/core/src/ packages/cli/src/ | head -20

# For model 7 (Simplicity First) — find large functions:
find packages/core/src -name "*.ts" -exec wc -l {} \; | sort -rn | head -15

# For model 5 (DAG Determinism) — test compile idempotency:
node packages/cli/dist/index.js compile --dir .converge/playbooks/self-improvement-loop
cp .converge/journal/self-improvement-loop/manifest.json /tmp/manifest1.json
node packages/cli/dist/index.js compile --dir .converge/playbooks/self-improvement-loop
cp .converge/journal/self-improvement-loop/manifest.json /tmp/manifest2.json
diff /tmp/manifest1.json /tmp/manifest2.json && echo "DETERMINISTIC" || echo "NOT DETERMINISTIC"

# For model 8 (Gap Detection) — trace the gap types:
grep -rn "GapKind\|gapKind\|gap.*type" packages/core/src/task/unit/ packages/core/src/task/gap/ | head -30

# For model 4 (Fingerprint) — trace hash inputs:
grep -rn "hashTask\|hashUpstream\|computeFingerprint\|fingerprint" packages/core/src/ | head -20
```

### Step 3: Find the gap
The gap is: what the mental model REQUIRES vs what the code ACTUALLY does.
Be specific. Every finding needs file:line evidence. Example findings:

- GOOD: "Model 3 violated at `packages/core/src/run/index.ts:310`: `getTargetDir(projectDir, playbookName)` hardcodes `.converge/journal/` path convention in framework code, should be parameterized via PlaybookPaths"
- GOOD: "Model 6 violated at `packages/core/src/executor/seed-executor.ts:152`: `(ctx as any)._keepLooping` — uses `as any` to access a deprecated property instead of the typed `ctx.loop` API"
- BAD: "Some files are too long" (no evidence)
- BAD: "The framework could be simpler" (no specificity)

### Step 4: Propose the correction
For the best finding, describe:
- What test to write that encodes the correct mental model
- What code change aligns the implementation
- Why this correction prevents future violations

## Output

Write `{{artifactsRel}}/observe/report.md` with the audit trace — what you read,
what commands you ran, what you found. Keep evidence command-backed.

Write `{{artifactsRel}}/observe/findings.json`:
```json
{
  "epoch": "{{epoch}}",
  "mental_model": "Checks, Not Vibes",
  "model_rule": "Shell commands verify correctness, not LLM judgment",
  "files_audited": ["packages/core/src/task/unit/find-gaps.ts", "packages/core/src/run/execute-task.ts"],
  "commands_run": ["grep -rn 'test -s' ...", "grep -rn 'GapKind' ..."],
  "findings": [
    {
      "id": "weak-checks-only-check-existence",
      "severity": "high",
      "dimension": "Correctness",
      "file": "packages/core/src/task/unit/find-gaps.ts",
      "line": "142",
      "gap": "The output-existence check only verifies the file exists, not that its content satisfies the contract. A task that writes an empty file passes checks.",
      "evidence": "find-gaps.ts line 142: `if (!existsSync(outputPath))` — only checks existence, never content validity",
      "correction": "Add content validation to check definitions: allow checks to specify expected content patterns (jq schema, grep pattern, line count range)",
      "test_to_write": "tests/playbook-output-validation.test.ts — test that a task producing an empty output file fails a content-aware check"
    }
  ]
}
```
