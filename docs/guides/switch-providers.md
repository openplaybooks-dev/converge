---
title: "Switch providers"
description: "Configure Claude, Gemini, Kimi, Qwen, or OpenRouter. Set up env vars, custom base URLs, per-task overrides."
sidebar:
  order: 5
---
# Switch providers

Converge supports multiple AI providers so you can mix budget models for exploration with premium models for synthesis. This guide covers every config option and how to switch providers at both the project and task level.

## Provider matrix

| Provider | Env var | Required config | Notes |
|---|---|---|---|
| `claude` | `ANTHROPIC_AUTH_TOKEN` | `provider: claude` | Uses Anthropic's CLI; supports custom base URL via `ANTHROPIC_BASE_URL` |
| `acp` | `apiKey` or shell env | `provider: acp`, `baseUrl`, `apiKey` | Agent SDK — works with OpenAI-compatible endpoints (MiniMax, Kimi, etc.) |
| `kimi` | `MINIMAX_API_KEY` (shell) | `provider: acp`, `baseUrl`, `apiKey` | Set baseUrl to Kimi's endpoint, use ACP provider |
| `qwen` | `apiKey` or shell env | `provider: acp`, `baseUrl`, `apiKey` | OpenAI-compatible — set baseUrl to Qwen's API |
| `gemini` | `apiKey` or shell env | `provider: acp`, `baseUrl`, `apiKey` | Via Google AI Studio endpoint |

> **Note:** The `qwen` and `gemini` provider types in the schema are reserved names. For actual Qwen or Gemini access, use the `acp` provider type with the appropriate `baseUrl`.

## Default provider

Set a project-wide default in `project.yml`:

```yaml
ai:
  default: claude
```

The `default` key names the provider from the `providers` map. Without `providers` (legacy/single-provider mode), the `provider` key directly names the type:

```yaml
ai:
  provider: acp
  apiKey: "${MINIMAX_API_KEY}"
  baseUrl: https://api.moonshot.cn/v1
  model: moonshot-v1-8k
```

## Multiple providers

Declare several providers and let different tasks use different ones:

```yaml
ai:
  default: claude
  providers:
    claude:
      provider: claude
      env:
        ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic"
        ANTHROPIC_AUTH_TOKEN: "${MINIMAX_AUTH_TOKEN}"

    cheap:
      provider: acp
      apiKey: "${CHEAP_API_KEY}"
      baseUrl: https://api.openai.com/v1
      model: gpt-4o-mini

    premium:
      provider: acp
      apiKey: "${PREMIUM_API_KEY}"
      baseUrl: https://api.anthropic.com
      model: claude-sonnet-4-20250514
```

Tasks can then specify which provider to use:

```yaml
tasks:
  - id: explore
    name: Explore codebase
    provider: cheap    # fast, low cost for scanning
    prompt: ...

  - id: synthesize
    name: Synthesize findings
    provider: premium  # quality for final output
    prompt: ...
```

This pattern — cheap model for early layers, premium for synthesis — is the single biggest cost lever in a research or analysis playbook.

## Custom base URL

For OpenRouter, MiniMax, or any Anthropic-compatible endpoint, set `ANTHROPIC_BASE_URL` under the `env` block for the `claude` provider:

```yaml
claude:
  provider: claude
  env:
    ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic"
    ANTHROPIC_AUTH_TOKEN: "${MINIMAX_API_KEY}"
    ANTHROPIC_MODEL: "MiniMax-M2.7"
```

The `claude` provider type uses the Anthropic CLI directly, so `ANTHROPIC_BASE_URL` redirects all requests — including those routed through MiniMax's Anthropic-compatible layer.

For non-Anthropic endpoints (raw OpenAI-compatible, Kimi, Qwen), use the `acp` provider type with `baseUrl`:

```yaml
kimi:
  provider: acp
  apiKey: "${MINIMAX_API_KEY}"
  baseUrl: https://api.moonshot.cn/v1
  model: moonshot-v1-8k
```

## Per-task override

Any task can override the default provider:

```yaml
tasks:
  - id: fast-scan
    name: Quick codebase scan
    provider: acp      # override default for this task
    prompt: Summarize the architecture.
```

The `provider` field accepts: `claude`, `acp`, `kimi`, `qwen`, `gemini`. Not all are first-class names — for Qwen or Gemini access, use `acp` with a matching `baseUrl`.

## API key hygiene

**Never hardcode API keys in `project.yml`.** Converge prints a warning if it detects a raw key literal in the config:

```
WARNING: literal API key detected in project.yml. Use env vars or .env instead.
```

Use shell environment variables or a `.env` file (gitignored by default):

```yaml
# ✅ Good — reference an env var
apiKey: "${MINIMAX_API_KEY}"

# ❌ Bad — key visible in config
apiKey: sk-cp-bvkVOmd1qhcraC7Q...
```

```bash
# .env (never commit this)
MINIMAX_API_KEY=sk-cp-bvkVOmd1qhcraC7Q...
```

```bash
# shell
export MINIMAX_API_KEY=sk-cp-bvkVOmd1qhcraC7Q...
```

The `env` block under the `claude` provider type also accepts env var references via `${VAR_NAME}` syntax, making it easy to inject keys without touching the config file.

## Cost-aware playbook design

Research and deep-dive playbooks burn the most tokens. The biggest lever is mixing providers per phase — use a fast cheap model to gather information, then switch to a premium model only for synthesis. For a full breakdown of how to chain providers across phases, see [Research a topic deeply](/guides/research-a-topic-deeply).
