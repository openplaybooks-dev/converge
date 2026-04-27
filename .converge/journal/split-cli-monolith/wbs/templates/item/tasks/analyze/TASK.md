---
id: "{{taskId}}"
title: "Analyze — {{title}}"
checks:
  - id: plan-written
    cmd: "test -f {{artifactsDir}}/analyze/plan.md"
    description: "Analysis plan exists"
---

# Analyze — {{title}}

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** {{task}}

**Full spec:**

{{spec}}

## Steps

1. **Read the spec** above carefully — it names exact file paths, line ranges, and acceptance criteria.
2. **Inspect current state:**
   - Read every file path named in the spec; note its current size, exports, imports.
   - Run `grep -rn "from.*<module>" packages/core/src` to enumerate real import sites — the spec's numbers are estimates, the grep is truth.
   - Check `git log --oneline -- <path>` for recent churn that might complicate the move.
3. **Identify risks:**
   - Cyclic imports introduced by the split
   - Public API paths that downstream packages (swebench, tbench) import from
   - Line-range drift since the spec was written — symbols may have moved
4. **Write the plan.**

## Output

Write `{{artifactsDir}}/analyze/plan.md`:

```markdown
# {{title}} — Analysis

## Source audit
- <file>: <current lines>, <exports>, <consumers found via grep>

## Implementation plan
1. Step — what to do and why
2. Step — ...

## Risks & mitigations
- <risk>: <mitigation>

## Acceptance checklist (copy from spec)
- [ ] <criterion>
- [ ] <criterion>
```
