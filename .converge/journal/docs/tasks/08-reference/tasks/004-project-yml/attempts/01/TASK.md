# Task: 08-reference/004-project-yml

# Write `docs/reference/project-yml.md`

Complete reference for `.converge/project.yml` (the project-level config,
distinct from per-playbook `playbook.yml`).

## Required frontmatter

```yaml
---
title: "project.yml"
description: "Project-level configuration: providers, defaults, plugins."
sources:
  - packages/core/src/storage/types.ts
  - examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml
sidebar:
  order: 4
---
```

## Required structure

1. **At-a-glance example.** A complete `project.yml`. The
   `examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml` is the
   canonical example — it shows the full `ai:` block with multiple providers.

2. **Field reference.**
   - `name` (string, required)
   - `description` (string, optional)
   - `ai` (object, required)
     - `default` (provider id, required)
     - `providers` (record of provider configs)
       - per-provider: `provider` type, `apiKey`, `baseUrl`, `model`,
         `timeoutMs`, `env` block
   - `metrics` (object, optional)
   - `variables` (object, optional)
   - `plugins` (array, optional)

3. **Provider types.** Enumerate from the source:
   - `claude` — Claude CLI, supports `env` block for `ANTHROPIC_BASE_URL` etc.
   - `acp` — Agent SDK, supports OpenAI-compatible base URLs
   - `gemini`, `kimi`, `qwen`, `opencode` — verify each by reading the source.

4. **Env interpolation.** `${VAR_NAME}` works in string values. Show the
   syntax. Recommend keeping API keys out of the file (use shell env).

## Read first

- `packages/core/src/storage/types.ts` — `ProjectConfigSchema` (or similarly
  named).
- `examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml` — every
  field that's actually used.
- `.converge/project.yaml` (the converge repo's own config) for a real
  in-tree example.

## Banned

- Documenting providers not implemented in the codebase. List only those that
  have working implementations.
- Documenting `metrics` fields not in the schema (the example has them; the
  schema is the contract).