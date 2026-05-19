# Skills Reference

How to make playbooks **skill-driven**: tasks describe *what* must exist, skills teach the AI *how* to produce it. Read when you're authoring a new playbook, factoring repeated "how-to" out of a task body, or writing a SKILL.md for the first time.

Canonical external reference: [Anthropic's skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md). The format below is compatible with it.

---

## Why skill-driven

A task isn't one document — it's three layers, and they answer different questions:

| Layer | Carries | Answers |
|---|---|---|
| **TASK.md frontmatter** | `id`, `inputs`, `outputs`, `checks`, `depends_on` | *What must exist when this task is done?* (the contract) |
| **TASK.md body** | The specific request and its situational context — names, paths, locale, catalog row, iteration number, whatever varies between invocations of the same kind of task | *What's special about **this** invocation?* (the subjective + context) |
| **SKILL.md** | Methodology, conventions, output shape, edge cases — the reasoning that's true for every invocation of this kind | *How does an AI produce that kind of deliverable in general?* (the how-to) |

When the same general how-to repeats across tasks — or when the methodology will plausibly be reused — it belongs in a skill, not in five copies of a TASK.md body. The runtime spawns the skill as a separate execution and merges the task's vars into the skill's context, so well-named skills compose without inflating any single prompt.

Anthropic's framing is precise: a one-shot prompt optimizes for a specific context; a skill optimizes for being invoked *a million times* with varied inputs. If your "how" only fits one task forever, keep it in the body. If the same "how" applies to many tasks with different subjective parameters, factor it into a skill — the body then carries only the *parameters*, not the *method*.

---

## When to create a skill vs. inline the prompt

| Situation | Decision |
|---|---|
| The same 20-line "how-to" repeats in 2+ tasks | **Skill.** Factor it. |
| The "how" is methodology, domain knowledge, or a multi-step workflow that future tasks will plausibly reuse | **Skill.** |
| The "how" is one-time orchestration (a one-off `converge spawn` loop, a glue script for this playbook only) | **Inline.** The body is the right home. |
| The task is one line ("run scripts/foo.sh") | **Inline.** A skill would be over-engineered. |
| The "how" needs to evolve independently of the task — the contract is stable, but the methodology is being refined | **Skill.** Tasks pin to skill names; the skill body can be updated without touching every TASK.md. |
| The "how" is shaped by something the agent CLI already does well (file editing, running tests) | **Inline.** Don't re-teach what the agent host already knows. |

A useful heuristic: **count the lines.** If a task body exceeds ~30 lines and most of it reads like "how to do this in general" rather than "what this specific task does," that body is asking to become a skill.

---

## Where skills live

The runtime searches for skills in this order — first hit wins:

1. **`.skill/<name>/SKILL.md`** — repo-local skill directory (rare; used when one skill is being iterated on outside the normal layout).
2. **`.converge/playbooks/<playbook>/skills/<name>/SKILL.md`** — **playbook-scoped** (recommended for skills that only matter inside this playbook).
3. **`.claude/skills/<name>/SKILL.md`** — **project-scoped** (recommended for skills shared across multiple playbooks in this repo). Also where `converge init --skills` installs the bundled Converge skills.
4. **`.converge/skills/<name>/SKILL.md`** — legacy global location; supported but discouraged for new work.

**Pick the narrowest scope.** A skill that's only relevant inside the `default` playbook should live under that playbook's `skills/` folder, not at `.claude/skills/`. This keeps the project root tidy and makes the playbook self-contained when copied or shared.

---

## Authoring a SKILL.md

The frontmatter shape compatible with both Converge and Anthropic's spec:

```markdown
---
name: greeting-author
description: >-
  Write greeting JSON files with required fields (name, language,
  timestamp). Use this skill whenever a task asks for a structured
  greeting file, a multi-locale hello message, or any
  `output/*greeting*.json` deliverable.
---

# Greeting Author

## When to use this skill
Tasks that need to produce a greeting JSON in the canonical
{name, language, timestamp} shape. Don't use this for free-form
greeting prose — write that inline.

## Instructions
1. Read the task's TASK.md for the target name, language code,
   and any timestamp constraint.
2. Write `output/greeting.json` (or the path the task declares)
   with exactly this shape:
   `{ "name": <string>, "language": <2-letter ISO>, "timestamp": <ISO-8601> }`.
3. If the task asks for multiple greetings, write a JSON array of
   the same shape.
4. The task's checks will verify the file. Don't second-guess them;
   if a check fails, re-read the contract and adjust the file.

## References
- `references/locales.md` — list of valid 2-letter ISO codes
- `scripts/validate-greeting.sh` — local validator the task can call
```

### Field-by-field

- **`name`** — kebab-case slug. Must match the directory name (`skills/greeting-author/SKILL.md`) and the value that tasks use in `skills: [greeting-author]`. No version suffixes (`-v2`); bump the body, keep the name.
- **`description`** — the **primary triggering mechanism**. Include both *what* the skill does and *when* an AI should reach for it. Keep around 100 words. Anthropic explicitly recommends writing descriptions "a little bit pushy" — models tend to under-trigger, and a description that names concrete triggers ("use this skill whenever the user mentions X, Y, Z") fires more reliably than a polite "this skill helps with X."
- **Body** — imperative instructions. Explain *why* things matter, not just lists of MUSTs. Realistic examples beat abstractions. Show input → output shape.

### Body structure (recommended)

```
# <Skill display name>

## When to use this skill
[1-2 paragraphs naming the trigger conditions concretely]

## Instructions
[Numbered list of the canonical workflow]

## Examples
[Realistic input → output pairs, especially for tricky cases]

## References
[Pointers to references/<topic>.md or scripts/<helper> for deeper material]
```

---

## Progressive disclosure

Anthropic's spec defines a 3-level hierarchy:

1. **Metadata** (name + description) — *always* in context for every agent invocation (~100 words).
2. **SKILL.md body** — loaded when the skill triggers. **Keep under 500 lines.**
3. **Bundled `references/`, `scripts/`, `assets/`** — loaded on demand by the agent following pointers in the body.

If SKILL.md is creeping past 500 lines, split. The pattern Anthropic ships:

```
skills/greeting-author/
├── SKILL.md                          ≤ 500 lines, the canonical workflow
├── references/
│   ├── locales.md                    list of valid ISO codes (loaded if needed)
│   ├── edge-cases.md                 unusual greeting shapes
│   └── i18n-tones.md                 cultural tone guidance
├── scripts/
│   └── validate-greeting.sh          deterministic validator
└── assets/
    └── greeting-template.json        canonical shape stub
```

The SKILL.md body says *"see `references/locales.md` if you need the full list of valid codes"* — the agent loads it only when it actually needs it.

For multi-variant skills (Anthropic's `cloud-deploy` example: AWS / GCP / Azure), give each variant its own file under `references/` rather than three separate skills. One discoverable skill, many loadable details.

---

## Composition

Skills can reference other skills. The resolver is recursive — a skill body that says "see also `references-skill-x`" works just like a TASK.md doing the same. Bundle deterministic helpers under `scripts/` so the AI doesn't reinvent them every invocation: if every task that uses the skill independently writes the same 5-line shell helper, hoist it into `scripts/`.

---

## Wiring into TASK.md

Reference one or more skills from a task:

```yaml
---
id: 01-create-greeting
title: Create greeting JSON
skills:
  - greeting-author
outputs:
  - output/greeting.json
checks:
  - id: greeting-exists
    cmd: test -f output/greeting.json
    description: greeting.json exists
  - id: valid-json
    cmd: jq empty output/greeting.json
    description: file is valid JSON
---
# Create greeting JSON

Use the skill to produce `output/greeting.json` for `name="World"`, `language="en"`, and `timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)`.
```

What changed: the task body went from a 30-line walkthrough to a one-paragraph delegation. The body now carries only what's specific to *this* invocation — the name (`World`), the language (`en`), the timestamp — and lets the skill handle the methodology. Future tasks that need a greeting JSON just reference the same skill and supply different parameters in their bodies.

Both `skill: <name>` (singular) and `skills: [<name>, ...]` (plural) parse; the plural form is canonical, the singular is legacy compatibility.

---

## Anti-patterns

- **Five tasks each copy-pasting the same 20-line how-to.** Factor it into a skill. This is the #1 signal.
- **A skill body that's one shell command.** Just inline it. Skills are for methodology, not one-liners.
- **A skill description that's one word ("greeting") or vague ("helps with formatting").** Won't trigger reliably. Be specific about *when* — list concrete trigger phrases the agent will see in real tasks.
- **A skill name with a version suffix** (`greeting-author-v2`). Update the body, keep the name. Tasks reference by name; bumping versions breaks every consumer.
- **SKILL.md that's 800 lines long.** Split. Move detail into `references/<topic>.md` and add a one-line pointer in the body.
- **A skill that's project-specific data ("our company's brand colors").** Skills are methodology, not configuration. Configuration belongs in project files the task reads.
- **Skills that wrap a single skill plus a TASK.md.** If the wrapper has no methodology of its own, just reference the inner skill directly.

---

## Authoring checklist

Before committing a new skill:

- [ ] `name` is kebab-case, matches the directory, no version suffix.
- [ ] `description` names the concrete trigger phrases an agent will see ("use this skill whenever…").
- [ ] Body opens with a "When to use this skill" section that's at least as specific as the description.
- [ ] Body is under 500 lines. Anything bigger goes to `references/`.
- [ ] At least one realistic input → output example.
- [ ] Skill is reachable from at least one TASK.md via `skills: [<name>]` (else it's dead weight).
- [ ] If the skill needs deterministic helpers, they live under `scripts/` and the body points at them.
