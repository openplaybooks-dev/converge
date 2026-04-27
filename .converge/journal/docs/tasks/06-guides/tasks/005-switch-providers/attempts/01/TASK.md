# Task: 06-guides/005-switch-providers

# Write `docs/guides/switch-providers.md`

The reader wants to use a different model. This page says how, exactly.

## Required frontmatter

```yaml
---
title: "Switch providers"
description: "Configure Claude, Gemini, Kimi, Qwen, or OpenRouter. Set up env vars, custom base URLs, per-task overrides."
sources:
  - examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml
  - packages/core/src/config
sidebar:
  order: 5
---
```

## Required structure

1. **Provider matrix.** A table: provider name | env var | required config |
   notes. Pull values from `examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml` —
   it has a complete `ai:` block.

2. **Default provider.** `project.yml` declares `ai.default`; show a minimal
   block.

3. **Multiple providers.** Show declaring multiple providers in `ai.providers`
   so different tasks can use different models (cheap model for early
   layers, premium for synthesis).

4. **Custom base URL.** For OpenRouter, MiniMax, or other Anthropic-compatible
   endpoints. Show the `env.ANTHROPIC_BASE_URL` pattern from the
   stitch-to-flutter example.

5. **Per-task override.** If supported (verify against the source — likely
   the `provider` field on a task; if it doesn't exist, don't claim it).

6. **API key hygiene.** Don't hardcode keys in `project.yml`. Use shell env
   vars or `.env` (gitignored). Mention any warning the framework prints if
   it sees a key literal in the config.

7. **Cost-aware playbook design.** One short paragraph linking forward to
   [Research a topic deeply](/guides/research-a-topic-deeply) — research
   playbooks burn the most tokens; mixing providers per phase is the
   biggest cost lever.

## Read first

- `examples/stitch-to-flutter-baby-watch-v2/.converge/project.yml` —
  canonical provider config example.
- `packages/core/src/config/` — the actual `ProjectConfigSchema` for the
  `ai:` field. Verify what's supported before documenting it.

## Banned

- Documenting a provider that isn't actually supported in the codebase.
- Inventing config keys (`ai.timeout`, `ai.retries`) without verifying.
- Recommending committing API keys to git.