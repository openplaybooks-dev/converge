---
id: 002-install
title: Write docs/getting-started/install.md
inputs:
  - README.md
  - packages/cli/package.json
  - package.json
outputs:
  - docs/getting-started/install.md
checks:
  - id: page-exists
    cmd: "test -f docs/getting-started/install.md"
    description: page exists
  - id: page-frontmatter
    cmd: "head -10 docs/getting-started/install.md | grep -q '^title:' && head -10 docs/getting-started/install.md | grep -q '^sources:'"
    description: title + sources frontmatter
  - id: shows-pnpm
    cmd: "grep -qE 'pnpm\\s+(add|install)' docs/getting-started/install.md"
    description: documents pnpm install
  - id: shows-verify-step
    cmd: "grep -qE 'converge\\s+(--version|--help)' docs/getting-started/install.md"
    description: documents how to verify install (version or help)
  - id: shows-env-vars
    cmd: "grep -qE 'API_KEY|ANTHROPIC|GEMINI|env' docs/getting-started/install.md"
    description: mentions provider API key env vars
---

# Write `docs/getting-started/install.md`

Goal: the reader can paste two commands and have a working `converge` CLI
within 60 seconds. No troubleshooting tree, no "advanced setup".

## Required frontmatter

```yaml
---
title: "Install"
description: "Install the Converge CLI and verify it runs."
sources:
  - README.md
  - packages/cli/package.json
  - package.json
sidebar:
  order: 2
---
```

## Required structure

1. **Prerequisites.** Node 22+ (verify with `node --version`). One line.
2. **Install.** Three tabs or three code blocks: pnpm, npm, bun. Every block is one line.
3. **Verify.** `converge --version` (or whatever the CLI exposes). Show expected output shape.
4. **Provider API key.** One paragraph: Converge calls an LLM provider. Set one of: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `KIMI_API_KEY`, or `QWEN_API_KEY`. Whichever provider you intend to use first — you can switch later (link to `guides/switch-providers`).
5. **Project install (optional).** If they want it in a specific project: `cd my-project && pnpm add -D @openplaybooks/converge`.

## Read first

- `README.md`: the canonical install instructions. **Match these byte-for-byte.** If they've drifted, this page is what gets corrected — but call it out.
- `packages/cli/package.json`: confirm the published name (`@openplaybooks/converge` vs other) and the `bin` entry. The `converge` command name comes from the `bin` field; verify before documenting.
- Root `package.json#engines.node`: source the Node version requirement.

## Voice + format

- Code blocks tagged with the right language (`bash`, `text`).
- No "Troubleshooting" section. Errors are surfaced naturally; if there are common ones, link to GitHub issues.
- Short paragraphs. One thought per paragraph.

## Banned

- A "Why Node 22?" digression. The version is what it is.
- Documenting Yarn (low usage in the ecosystem we target).
- Generating fake CLI output. If you can't verify what `converge --version` prints, leave the expected-output block as `<your version>` rather than inventing.
