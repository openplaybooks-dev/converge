---
title: "project.yml"
description: "Project-level configuration: providers, defaults, plugins."
sidebar:
  order: 4
---
# project.yml

Project-level configuration for `.converge/project.yaml`. This configures AI providers and defaults used across all playbooks in the project.

## At-a-glance example

```yaml
name: my-project
description: My project description

ai:
  default: claude
  providers:
    claude:
      provider: claude
      env:
        ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic"
        ANTHROPIC_AUTH_TOKEN: "${MINIMAX_API_KEY}"
    acp:
      provider: acp
      apiKey: "${MINIMAX_API_KEY}"
      baseUrl: https://api.minimax.io/anthropic
      model: MiniMax-M2.7
      timeoutMs: 3000000

metrics:
  subscription:
    enabled: true
    flatFee: 20.00
    requestsIncluded: 4500

variables: {}
plugins: []
```

## Field reference

### `name` (string, required)

Project identifier. Used in logs and reporting.

### `description` (string, optional)

Human-readable project description.

### `ai` (object, required)

AI provider configuration.

#### `ai.default` (string, required)

Provider ID to use by default (must match a key in `ai.providers`).

#### `ai.providers` (record, required)

Named map of provider configurations.

##### Per-provider fields

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Provider type: `claude`, `codex`, `acp`, `kimi`, `qwen`, `gemini`, `deepcode` |
| `apiKey` | string | API key for the provider |
| `baseUrl` | string | Base URL for OpenAI-compatible APIs |
| `model` | string | Model identifier |
| `timeoutMs` | number | Request timeout in milliseconds |
| `env` | record | Environment variables passed to CLI-backed providers such as Claude, Codex, and DeepCode |

### `metrics` (object, optional)

Cost tracking and pricing configuration.

#### `metrics.pricing` (record)

Per-model pricing `{ inputPer1M: number, outputPer1M: number }`.

#### `metrics.subscription` (object)

Flat-fee subscription pricing:

```yaml
metrics:
  subscription:
    enabled: true
    flatFee: 20.00
    requestsIncluded: 4500
```

### `variables` (object, optional)

Variables accessible to all tasks in the project.

### `plugins` (array, optional)

Plugins to load. Each entry is a string plugin name or a tuple `[name, options]`.

## Provider types

### `claude`: Claude CLI

Uses the Claude CLI binary. Supports the `env` block for setting environment variables like `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, etc.

```yaml
claude:
  provider: claude
  env:
    ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic"
    ANTHROPIC_AUTH_TOKEN: "${MINIMAX_API_KEY}"
```

### `acp`: Agent SDK

OpenAI-compatible API client. Supports `apiKey`, `baseUrl`, `model`, `timeoutMs`.

```yaml
acp:
  provider: acp
  apiKey: "${MINIMAX_API_KEY}"
  baseUrl: https://api.minimax.io/anthropic
  model: MiniMax-M2.7
  timeoutMs: 3000000
```

### `codex`: OpenAI Codex CLI

Uses the Codex CLI binary. Supports the `env` block for `CODEX_API_KEY` or `OPENAI_API_KEY`.

```yaml
codex:
  provider: codex
  env:
    CODEX_API_KEY: "${CODEX_API_KEY}"
```

### `kimi`: Kimi

Direct provider ID scaffolded by `converge init`.

### `qwen`: Qwen

Direct provider ID scaffolded by `converge init`.

### `gemini`: Gemini

Direct provider ID scaffolded by `converge init`.

### `deepcode`: DeepCode CLI

Uses the HKUDS DeepCode CLI.

```yaml
deepcode:
  provider: deepcode
  env:
    DEEPCODE_CONFIG_PATH: "${DEEPCODE_CONFIG_PATH}"
```

## Env interpolation

String values support `${VAR_NAME}` syntax for shell environment variable substitution. This keeps API keys out of the config file:

```yaml
env:
  ANTHROPIC_AUTH_TOKEN: "${MINIMAX_API_KEY}"
```

Keep sensitive credentials in shell environment rather than hardcoding in `project.yml`.
