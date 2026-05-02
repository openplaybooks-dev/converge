---
id: "{{prefix}}-{{slug}}"
title: "Example page: {{title}}"
description: "Document the {{slug}} example — what problem it solves, how it's structured, how to run it."
inputs:
  - "{{readmePath}}"
  - "{{playbookPath}}"
outputs:
  - "{{pagePath}}"
checks:
  - id: page-exists
    cmd: "test -f {{pagePath}}"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 {{pagePath}} | grep -q '^title:' && head -10 {{pagePath}} | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: page-mentions-slug
    cmd: "grep -qE '{{slug}}' {{pagePath}}"
    description: page references the example by name
  - id: page-has-what-it-does
    cmd: "grep -qiE '^##\\s+(what|problem|overview)' {{pagePath}}"
    description: page has a What/Problem/Overview section
  - id: page-has-run-section
    cmd: "grep -qiE '^##\\s+(run|usage|how to run)' {{pagePath}}"
    description: page has a Run/Usage section
  - id: page-has-tweak-or-related
    cmd: "grep -qiE '^##\\s+(tweak|customize|make it your own|related|next)' {{pagePath}}"
    description: page has a Tweak/Customize or Related section
---

# Example page: `{{slug}}`

Write `{{pagePath}}` documenting the `examples/{{slug}}/` example.

## Required frontmatter

```yaml
---
title: "{{title}}"
description: "{{tagline}}"
sources:
  - {{readmePath}}
  - {{playbookPath}}
sidebar:
  label: "{{title}}"
---
```

If `{{readmePath}}` is empty (the example has no README), declare only the
playbook path. If the playbook path is also empty, declare the example's
*directory* as a source: `examples/{{slug}}/`.

## Required structure

### What it does

One paragraph adapted from the example's README opener (or, if no README,
inferred from the playbook). Avoid copying verbatim — paraphrase to fit
the gallery voice.

### How it's structured

A bulleted list of the playbook's phases at a glance. Read
`{{playbookPath}}` and list each top-level entry under `tasks:` with a
one-line description (taken from the phase's `TASK.md` if you can find
it, otherwise from the phase id alone).

If the example has no playbook (`{{hasPlaybook}}` is `false`), say so
explicitly and show the file tree instead:

```bash
tree -L 2 examples/{{slug}}/
```

### How to run

Concrete commands. Read the README's "Usage" / "Run" section for the
canonical recipe. Common shape:

```bash
cd examples/{{slug}}/
converge run
```

If the example needs setup (env vars, data file, external tool), list it
as a "Prerequisites" sub-section *above* the run command.

### Make it your own

The 2-3 files most readers will edit first. Pick from:

- The top-level `playbook.yml` — usually rename + tweak the
  `description`.
- A topic / input file at the project root (e.g. `idea.md`,
  `topic.md`, `target.txt`).
- One template directory under `tasks/.../wbs/templates/` if the
  example is template-driven.

If you're not sure, read the README's "Customize" or "Edit" section.
Don't fabricate — if the README doesn't say what to edit, say "see the
README for customization notes" and link out.

### Related

1-3 links. Pick:
- 1 sibling example in the same category
  (`/examples/{{category}}/<other-slug>`).
- 1 cross-category example with a similar shape, if any.
- 1 guide that explains the technique
  (e.g. `/guides/research-a-topic-deeply`,
  `/guides/build-a-software-project`).

## Read first

- `{{readmePath}}` — the canonical description of the example. Quote
  selectively, paraphrase for gallery voice.
- `{{playbookPath}}` — for the structural overview. Don't invent phases
  that aren't there.
- For `{{slug}}` specifically: skim 1-2 representative `TASK.md` files
  under `examples/{{slug}}/.converge/playbooks/*/tasks/` to ground the
  "how it's structured" section.

## Banned

- Copying the README verbatim. Paraphrase for the gallery voice.
- Inventing phases or files that aren't in the example.
- Marketing language ("powerful", "robust", "cutting-edge").
- Documenting a category other than `{{category}}` for this example.
- Linking to examples that aren't in `docs/_examples.json`.
- Skipping the "How to run" section. The whole point of an example is
  it's runnable.

## Notes for examples missing data

- `{{hasReadme}}` is `{{hasReadme}}`. If `false`, lead with a one-line
  acknowledgement ("This example has no README; the playbook is the
  primary documentation.") and synthesize the "What it does" paragraph
  from the playbook's `description:` field.
- `{{hasPlaybook}}` is `{{hasPlaybook}}`. If `false`, say so and treat the
  page as a "scratch / WIP" entry. Show the file tree, link to the source
  directory on GitHub, and skip the "How to run" section.
