---
title: "Provider setup"
description: "Configure a backend (agent CLI) and provider (LLM endpoint) so converge run can dispatch tasks."
sidebar:
  order: 6
---

# Provider setup

Before `converge run` can dispatch a single task, your project needs to know **which agent CLI to spawn** and **which LLM endpoint that CLI should talk to**. `converge init` configures both in one shot. This guide covers every supported combination.

For switching providers mid-playbook — per-task overrides, mixing cheap/premium models, runtime metrics — see [Switch providers](../guides/switch-providers.md). This page is only about the initial setup.

## Backend vs. provider

`converge init` exposes two orthogonal axes:

| Flag | Names | Meaning |
|---|---|---|
| `--backend` | the agent CLI that drives the run | `claude`, `codex`, `gemini`, `kimi`, `qwen`, `acp`, `deepcode` |
| `--provider` | the LLM endpoint that backend talks to | `anthropic-oauth`, `anthropic`, `minimax`, `deepseek`, `openai`, `kimi`, `qwen`, `gemini`, `custom` |

Most backends have one natural provider — the `gemini` backend talks to the `gemini` provider, the `qwen` backend to the `qwen` provider, and so on. The `claude` backend is the exception: because Anthropic's CLI honors `ANTHROPIC_BASE_URL`, you can route Claude through five different providers (OAuth, direct Anthropic, MiniMax, DeepSeek, or any custom endpoint) without changing how playbooks are written.

`kimi`, `qwen`, and `gemini` happen to name both a backend (the vendor's CLI) and a provider (their LLM API). Same string, different concept — picking one as a backend implies the matching provider unless you pass `--provider` explicitly.

## Pick a happy path

| Situation | Command |
|---|---|
| I have a Claude.ai subscription | `converge init --skills --backend=claude --provider=anthropic-oauth` |
| I want cheap autonomous runs, single model | `converge init --skills --backend=claude --provider=minimax` |
| I want cheap autonomous runs, two-tier model | `converge init --skills --backend=claude --provider=deepseek` |
| I use Codex or have OpenAI keys | `converge init --skills --backend=codex --provider=openai` |
| I run Gemini / Kimi / Qwen directly | `converge init --skills --backend=<vendor>` |
| I have a custom OpenAI-compatible endpoint | `converge init --skills --backend=acp --provider=custom` |

`--skills` installs the bundled `/converge-planning` and `/converge-control` skills under `.claude/skills/` and `.codex/skills/`. Always pass it on first run — and re-pass it after upgrading Converge to refresh the skills.

If you omit both flags, `converge init` defaults to `--backend=claude --provider=anthropic-oauth`.

## The full catalog

### Backends

| Backend | CLI required | Default provider | Notes |
|---|---|---|---|
| `claude` | `claude` (Anthropic CLI) | `anthropic-oauth` | Recommended. Five provider options. |
| `codex` | `codex` (`npm i -g @openai/codex`) | `openai` | |
| `gemini` | `gemini` CLI | `gemini` | |
| `kimi` | Kimi CLI | `kimi` | |
| `qwen` | Qwen CLI | `qwen` | |
| `acp` | none (uses Anthropic Agent SDK) | `custom` | Use for OpenAI-compatible endpoints. |
| `deepcode` | HKUDS DeepCode CLI | `custom` | |

Sourced from `BACKEND_CATALOG` in [`packages/cli/src/commands.ts`](../../packages/cli/src/commands.ts).

### Providers

| Provider | Valid backends | Env vars to export | Endpoint / models |
|---|---|---|---|
| `anthropic-oauth` | `claude` | none — run `claude login` once | reads `~/.claude/.credentials.json` |
| `anthropic` | `claude` | `ANTHROPIC_API_KEY` | direct Anthropic API |
| `minimax` | `claude` | `MINIMAX_API_KEY` | `https://api.minimax.io/anthropic`, model `MiniMax-M2.7` |
| `deepseek` | `claude` | `DEEPSEEK_API_KEY` | `https://api.deepseek.com/anthropic`, models `deepseek-v4-pro` + `deepseek-v4-flash` |
| `openai` | `codex` | `CODEX_API_KEY` or `OPENAI_API_KEY` | direct OpenAI API |
| `kimi` | `kimi` | `KIMI_API_KEY` | direct Moonshot |
| `qwen` | `qwen` | `QWEN_API_KEY` | direct Alibaba |
| `gemini` | `gemini` | `GEMINI_API_KEY` | direct Google |
| `custom` | any | depends on endpoint | edit `.converge/project.yaml` after init |

Sourced from `PROVIDER_CATALOG` in [`packages/cli/src/commands.ts`](../../packages/cli/src/commands.ts).

## Walkthroughs

Each walkthrough: prereq → export → `converge init` → expected `project.yaml` → smoke test. The YAML blocks below match exactly what `converge init` writes — copy-paste fidelity is intentional.

### Claude via OAuth

Recommended for human-in-the-loop work where you're already signed into Claude.

```bash
claude login                  # once, ever — opens browser
mkdir my-project && cd my-project
converge init --skills --backend=claude --provider=anthropic-oauth
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: claude
  providers:
    claude:
      provider: claude
      # Uses Anthropic's Claude CLI. Auth via ANTHROPIC_AUTH_TOKEN env var.

variables: {}
plugins: []
```

Smoke test:

```bash
converge add --from-example hello-world
converge run
```

### Claude via direct Anthropic API

For headless environments or when you want a long-lived API key instead of OAuth.

```bash
export ANTHROPIC_API_KEY=sk-ant-…
converge init --skills --backend=claude --provider=anthropic
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: claude
  providers:
    claude:
      provider: claude
      env:
        ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}

variables: {}
plugins: []
```

### Claude routed through MiniMax

Cheap, single-model. MiniMax exposes an Anthropic-compatible endpoint, so the Claude CLI works unchanged.

```bash
export MINIMAX_API_KEY=…
converge init --skills --backend=claude --provider=minimax
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: claude
  providers:
    claude:
      provider: claude
      env:
        ANTHROPIC_BASE_URL: "https://api.minimax.io/anthropic"
        ANTHROPIC_AUTH_TOKEN: ${MINIMAX_API_KEY}
        ANTHROPIC_MODEL: MiniMax-M2.7
        ANTHROPIC_DEFAULT_SONNET_MODEL: MiniMax-M2.7
        ANTHROPIC_DEFAULT_OPUS_MODEL: MiniMax-M2.7
        ANTHROPIC_DEFAULT_HAIKU_MODEL: MiniMax-M2.7
        API_TIMEOUT_MS: "3000000"
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1"

variables: {}
plugins: []
```

The full env block — `ANTHROPIC_MODEL`, the three `DEFAULT_*_MODEL` overrides, the timeout, the telemetry opt-out — is what Claude Code needs to actually route through MiniMax. Don't trim it.

Endpoint reference: [MiniMax Claude Code integration](https://platform.minimax.io/docs/token-plan/claude-code).

### Claude routed through DeepSeek

Cheap, two-tier. Primary tasks use `deepseek-v4-pro`; subagent / Haiku-class work falls to the cheaper `deepseek-v4-flash`.

```bash
export DEEPSEEK_API_KEY=…
converge init --skills --backend=claude --provider=deepseek
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: claude
  providers:
    claude:
      provider: claude
      env:
        ANTHROPIC_BASE_URL: "https://api.deepseek.com/anthropic"
        ANTHROPIC_AUTH_TOKEN: ${DEEPSEEK_API_KEY}
        ANTHROPIC_MODEL: deepseek-v4-pro
        ANTHROPIC_DEFAULT_OPUS_MODEL: deepseek-v4-pro
        ANTHROPIC_DEFAULT_SONNET_MODEL: deepseek-v4-pro
        ANTHROPIC_DEFAULT_HAIKU_MODEL: deepseek-v4-flash
        CLAUDE_CODE_SUBAGENT_MODEL: deepseek-v4-flash
        CLAUDE_CODE_EFFORT_LEVEL: max

variables: {}
plugins: []
```

Endpoint reference: [DeepSeek Claude Code integration](https://api-docs.deepseek.com/quick_start/agent_integrations/claude_code).

### Codex via OpenAI

```bash
npm install -g @openai/codex
export CODEX_API_KEY=…       # or OPENAI_API_KEY
converge init --skills --backend=codex --provider=openai
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: codex
  providers:
    codex:
      provider: codex
      # Auth via CODEX_API_KEY or OPENAI_API_KEY env var.
      env:
        CODEX_API_KEY: ${CODEX_API_KEY}

variables: {}
plugins: []
```

### Gemini direct

```bash
export GEMINI_API_KEY=…
converge init --skills --backend=gemini
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: gemini
  providers:
    gemini:
      provider: gemini
      apiKey: ${GEMINI_API_KEY}

variables: {}
plugins: []
```

### Kimi direct

```bash
export KIMI_API_KEY=…
converge init --skills --backend=kimi
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: kimi
  providers:
    kimi:
      provider: kimi
      apiKey: ${KIMI_API_KEY}

variables: {}
plugins: []
```

### Qwen direct

```bash
export QWEN_API_KEY=…
converge init --skills --backend=qwen
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: qwen
  providers:
    qwen:
      provider: qwen
      apiKey: ${QWEN_API_KEY}

variables: {}
plugins: []
```

### ACP (custom OpenAI-compatible endpoint)

Use this when you want to point at an arbitrary OpenAI-compatible API — Moonshot, OpenRouter, a self-hosted vLLM, or anything else with a `/v1/chat/completions` endpoint.

```bash
export ACP_API_KEY=…
converge init --skills --backend=acp --provider=custom
```

Generated `.converge/project.yaml` (scaffolded with Moonshot as a placeholder — edit `baseUrl` and `model` for your endpoint):

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: acp
  providers:
    acp:
      provider: acp
      apiKey: ${ACP_API_KEY}
      baseUrl: https://api.moonshot.cn/v1
      model: moonshot-v1-8k

variables: {}
plugins: []
```

### DeepCode

Requires the HKUDS DeepCode CLI to be installed and configured separately.

```bash
export DEEPCODE_CONFIG_PATH=/path/to/deepcode.yaml
converge init --skills --backend=deepcode
```

Generated `.converge/project.yaml`:

```yaml
version: 2
name: my-project

# AI provider configuration — one default, multiple enabled.
# Replace $VAR placeholders with real keys or export them in your shell.
ai:
  default: deepcode
  providers:
    deepcode:
      provider: deepcode
      # Requires HKUDS DeepCode to be installed and configured.
      env:
        DEEPCODE_CONFIG_PATH: ${DEEPCODE_CONFIG_PATH}

variables: {}
plugins: []
```

## Troubleshooting first-run failures

**`Invalid API key` / `HTTP 401` on the very first task.** Almost always conflicting `ANTHROPIC_*` env vars left over from a previous setup. Diagnose and fix:

```bash
env | grep -E 'ANTHROPIC|CLAUDE_CODE' 
# Unset anything you don't recognize, then re-run converge run.
unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_API_KEY
```

`converge init` writes the right env vars into `.converge/project.yaml` and Converge re-injects them per task; shell-level `ANTHROPIC_*` exports can override and break that.

**`converge init` defaults to OAuth even though I want a direct key.** That's the documented default for `--backend=claude`. Pass `--provider=anthropic` (or `--provider=minimax`, etc.) explicitly.

**Skills weren't installed or feel stale.** Re-run `converge init --skills` on the initialized project. The flag always overwrites the bundled `/converge-planning` and `/converge-control` skill files; your `.converge/` project state is untouched.

**The CLI isn't found.** Confirm `converge --version` works after `npm install -g @openplaybooks/converge`. If you used a Node version manager, check that the npm prefix is on your PATH.

## Next steps

- [Your first playbook](./your-first-playbook.md) — scaffold, add one task, run.
- [Switch providers](../guides/switch-providers.md) — per-task overrides, mixing cheap/premium models, metrics, key hygiene.
