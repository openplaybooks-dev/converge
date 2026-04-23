# Task: 001-do/item-mo7tdcbr/001-analyze

# Analyze task

Parse the task input, gather context, and write an implementation plan.

## Input

**Task:** `unknown task`

## Steps

1. **Parse the input:**
   - If it's a GitHub issue URL (e.g. `github.com/org/repo/issues/N`): run `gh issue view <URL>` to fetch title, body, labels, and comments
   - If it's a GitHub PR URL: run `gh pr view <URL>` to fetch details
   - If it's free text: use it directly as the task description

2. **Understand the codebase context:**
   - Identify which files/modules are relevant to this task
   - Note existing patterns, conventions, and test coverage in those areas
   - Check for related recent changes (`git log --oneline -20`)

3. **Write the plan:**
   - Break the task into concrete, ordered steps
   - Identify files to create/modify
   - Note any risks or edge cases

## Output

Write `/Users/minh/Documents/converge/.converge/artifacts/do/item-mo7tdcbr/analyze/plan.md`:

```markdown
# Task Analysis

## Original Request
<parsed task description>

## Scope
- Files to modify: ...
- Files to create: ...
- Estimated complexity: low/medium/high

## Implementation Plan
1. Step 1 — what to do and why
2. Step 2 — ...
3. Step N — ...

## Risks & Edge Cases
- ...
```