---
title: "Switch providers"
description: "Configure Claude, Codex, ACP, Gemini, Kimi, Qwen, DeepCode, or OpenAI-compatible endpoints."
sidebar:
  order: 5
---
# Switch providers

Converge supports multiple AI providers so you can mix budget models for exploration with premium models for synthesis. This guide covers every config option and how to switch providers at both the project and task level.

## Provider matrix

| Provider | Env var | Required config | Notes |
|---|---|---|---|
| `claude` | `ANTHROPIC_AUTH_TOKEN` | `provider: claude` | Uses Anthropic's CLI; supports custom base URL via `ANTHROPIC_BASE_URL` |
| `codex` | `CODEX_API_KEY` or `OPENAI_API_KEY` | `provider: codex` | Uses the Codex CLI |
| `acp` | `apiKey` or shell env | `provider: acp`, `baseUrl`, `apiKey` | Agent SDK: works with OpenAI-compatible endpoints |
| `kimi` | `KIMI_API_KEY` | `provider: kimi` | Direct provider ID scaffolded by `converge init` |
| `qwen` | `QWEN_API_KEY` | `provider: qwen` | Direct provider ID scaffolded by `converge init` |
| `gemini` | `GEMINI_API_KEY` | `provider: gemini` | Direct provider ID scaffolded by `converge init` |
| `deepcode` | `DEEPCODE_CONFIG_PATH` | `provider: deepcode` | Uses the HKUDS DeepCode CLI |

Use `acp` when you want an arbitrary OpenAI-compatible endpoint or when you want to route through a custom `baseUrl`.

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

This pattern: cheap model for early layers, premium for synthesis: is the single biggest cost lever in a research or analysis playbook.

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

The `claude` provider type uses the Anthropic CLI directly, so `ANTHROPIC_BASE_URL` redirects all requests: including those routed through MiniMax's Anthropic-compatible layer.

For non-Anthropic endpoints or custom OpenAI-compatible routing, use the `acp` provider type with `baseUrl`:

```yaml
kimi-via-acp:
  provider: acp
  apiKey: "${MINIMAX_API_KEY}"
  baseUrl: https://api.moonshot.cn/v1
  model: moonshot-v1-8k
```

## Per-task override

Each task can override the default provider declaratively in the `TASK.md` frontmatter via the `ai:` block.

### Declarative `ai:` block (TASK.md)

For finer control, declare an `ai:` block in the task's TASK.md frontmatter. Every field maps directly to the agent function options:

```yaml
---
id: synthesize
title: Synthesize findings
ai:
  provider: premium             # which provider (from project.yml providers map)
  model: claude-sonnet-4-20250514  # model selection
  timeoutMs: 300000             # max duration before abort (default: 300_000)
  maxRetries: 3                 # retries on crash (default: 2)
  allowedTools:                 # restrict available tools
    - Read
    - Write
    - Bash
  options:                      # provider-specific passthrough
    effort: high                #   claude: reasoning effort
    sandbox: workspace-write    #   codex: sandbox mode
    maxBudgetUsd: 5.0           #   claude: cost cap
checks:
  - id: output-exists
    cmd: test -f synthesis.md
---
```

| Field | Type | Description |
|---|---|---|
| `provider` | `string` | Provider key from `project.yml` `providers` map |
| `model` | `string` | Model name (e.g. `gpt-5.4`, `claude-sonnet-4-20250514`) |
| `timeoutMs` | `number` | Max execution time in ms before abort |
| `maxRetries` | `number` | Retries on spawn crash (STATUS_DLL_INIT_FAILED, etc.) |
| `allowedTools` | `string[]` | Whitelist of tools the agent may use |
| `options` | `object` | Provider-specific options passed directly to the agent function |

The shorthand `agent: premium` (top-level in TASK.md or playbook.yml) still works and is equivalent to `ai: { provider: premium }`. When both are set, `ai.provider` takes precedence.

### Mixing providers in one playbook

A common cost-saving pattern: cheap model for exploration, premium for synthesis:

```yaml
# TASK.md for the exploration task
---
id: explore
ai:
  provider: cheap
  model: gpt-4o-mini
  timeoutMs: 120000
---
Scan the codebase for authentication patterns and list every auth call site.

# TASK.md for the synthesis task  
---
id: synthesize
ai:
  provider: premium
  model: claude-sonnet-4-20250514
  options:
    effort: high
---
Based on the auth audit, propose a unified auth module with migration steps.
```

## Metrics

Every task execution records provider and model in the journal events:

```jsonl
{"eventType":"AGENT_START","metadata":{"phase":"run_task","provider":"premium","model":"claude-sonnet-4-20250514"},...}
{"eventType":"AGENT_COMPLETE","metadata":{"phase":"run_task","durationMs":27080,"provider":"premium","model":"claude-sonnet-4-20250514"},...}
```

This lets you audit which provider handled each task and compute per-provider cost/duration after the run: no guessing which model actually executed.

## API key hygiene

**Never hardcode API keys in `project.yml`.** Converge prints a warning if it detects a raw key literal in the config:

```
WARNING: literal API key detected in project.yml. Use env vars or .env instead.
```

Use shell environment variables or a `.env` file (gitignored by default):

```yaml
# ✅ Good: reference an env var
apiKey: "${MINIMAX_API_KEY}"

# ❌ Bad: key visible in config
apiKey: <REDACTED_MINIMAX_TOKEN>...
```

```bash
# .env (never commit this)
MINIMAX_API_KEY=<REDACTED_MINIMAX_TOKEN>...
```

```bash
# shell
export MINIMAX_API_KEY=<REDACTED_MINIMAX_TOKEN>...
```

The `env` block under the `claude` provider type also accepts env var references via `${VAR_NAME}` syntax, making it easy to inject keys without touching the config file.

## Cost-aware playbook design

Research and deep-dive playbooks burn the most tokens. The biggest lever is mixing providers per phase: use a fast cheap model to gather information, then switch to a premium model only for synthesis. For a full breakdown of how to chain providers across phases, see [Research a topic deeply](/guides/research-a-topic-deeply).
