# Skills Reference

When to factor a skill out of a task body, and how to write it.

---

## The three layers

| Layer | Carries | Answers |
|---|---|---|
| TASK.md frontmatter | `id`, `inputs`, `outputs`, `checks`, `depends_on` | *What must exist when done?* |
| TASK.md body | Names, paths, catalog row, iteration — what varies per invocation | *What's special about this instance?* |
| SKILL.md | Methodology, conventions, output shape, edge cases | *How to produce this kind of deliverable in general?* |

When the same 20+ lines of "how to do this" repeat across tasks, factor into a skill.

---

## When to inline vs. skill

| Situation | Decision |
|---|---|
| Same how-to repeats in 2+ tasks | Skill |
| Methodology a future task will reuse | Skill |
| One-time orchestration for this playbook only | Inline |
| One-liner (`run scripts/foo.sh`) | Inline |
| Methodology evolving independently from the contract | Skill |
| Body exceeds ~30 lines and most is "how to do this in general" | Skill |

---

## Where skills live

Narrowest scope wins:

1. `.converge/playbooks/<playbook>/skills/<name>/SKILL.md` — playbook-scoped
2. `.claude/skills/<name>/SKILL.md` — project-scoped

Don't put playbook-specific skills at the project root.

---

## SKILL.md format

```markdown
---
name: greeting-author
description: >-
  Write greeting JSON with required fields (name, language, timestamp).
  Use when a task asks for `output/*greeting*.json` or multi-locale hello.
---

# Greeting Author

## When to use this skill
Tasks producing greeting JSON files. Not for free-form prose.

## Instructions
1. Read the task's inputs for name, language, timestamp constraint.
2. Write the output file with shape: `{ "name": <string>, "language": <ISO>, "timestamp": <ISO-8601> }`.
3. Return the path in your response.

## Examples
Input: name="World", language="en" → output/greeting.json
```

**Rules:**
- `name` is kebab-case, matches directory, no version suffix.
- `description` is the triggering mechanism — list concrete phrases.
- Body is imperative, under 500 lines. Move detail to `references/`.
- Show input → output examples.
- Bundle deterministic helpers in `scripts/`.