---
id: "{{prefix}}-{{slug}}"
title: "Reference: converge {{name}}"
description: "Document the `converge {{name}}` command — flags, behaviour, examples."
inputs:
  - packages/cli/src/main.ts
  - "{{handlerFile}}"
outputs:
  - "{{pagePath}}"
checks:
  - id: page-exists
    cmd: "test -f {{pagePath}}"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 {{pagePath}} | grep -q '^title:' && head -10 {{pagePath}} | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: page-mentions-command
    cmd: "grep -qE 'converge\\s+{{name}}' {{pagePath}}"
    description: page mentions the command name
  - id: page-has-synopsis
    cmd: "grep -qiE '^##\\s+(synopsis|usage)' {{pagePath}}"
    description: page has Synopsis or Usage section
  - id: page-has-options
    cmd: "grep -qiE '^##\\s+(options|flags)' {{pagePath}} || grep -qE 'no flags|no options' {{pagePath}}"
    description: page documents options (or explicitly states there are none)
  - id: page-has-example
    cmd: "grep -qiE '^##\\s+example' {{pagePath}}"
    description: page includes at least one example
---

# Reference: `converge {{name}}`

Write `{{pagePath}}` documenting the `converge {{name}}` command.

## Required frontmatter

```yaml
---
title: "converge {{name}}"
description: "<one-line summary of what the command does>"
sources:
  - packages/cli/src/main.ts
  - "{{handlerFile}}"
sidebar:
  label: "{{name}}"
---
```

## Required structure

### Synopsis
Single line showing the command shape:
```
converge {{name}} [options]
```

### Description
One paragraph: what this command does, when you'd use it. Read it from the
handler file's exported function — its first comment block usually says it.

### Options
Table or list of flags this command accepts. **Read these from the handler
file.** If the handler is `{{handler}}` and lives at `{{handlerFile}}`,
open that file and look at how it consumes `options`. Document each flag:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dir <path>` | string | cwd | Working directory |
| ... | ... | ... | ... |

If you can't determine flag types from the source (this CLI doesn't use a
declarative framework), document what you can verify from `options.<name>`
references in the handler.

### Examples
At least one. Show the command and the expected outcome (the file it
produces, the state it changes, the output it prints). Don't fabricate
output text — describe the shape.

```bash
converge {{name}}
# <what happens — verified from the handler>
```

### Related
- 1-3 links to related commands or guides.

## Read first

- `packages/cli/src/main.ts` around line {{line}} — the dispatch.
- `{{handlerFile}}` — the actual implementation. This is where the truth
  lives.
- If the handler is missing (`{{handler}}` is empty), the command may be
  a fall-through case in main.ts. Read the case body directly to figure out
  what it does.

## Banned

- Documenting flags that aren't in the handler. The CLI parser is loose;
  document only what's verifiably consumed.
- Generic "this command does the obvious thing" prose. If the obvious thing
  is wrong, the page is worse than no page.
- Inventing exit codes. The CLI uses 0/non-0; describe behavior, not codes.
