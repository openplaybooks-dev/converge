# ACP (Claude Agent SDK) Provider Demo

Demonstrates the **`acp` provider** — Converge's adapter for the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). Unlike the `claude` provider (which spawns the `claude` CLI as a subprocess), `acp` invokes the SDK in-process, enabling native streaming, programmatic MCP server configuration, and native session resume.

> **Note:** This example demonstrates the **`acp` provider integration**. The bundled `playbook.yml` is in an older SDK-step format and is currently used as a reference for SDK usage, not as a runnable Converge playbook. For runnable Converge playbooks that use the `acp` provider, see [`flutter-app`](../flutter-app/) (which configures `acp` alongside `claude`).

## What it demonstrates

- Configuring the `acp` provider in `.converge/project.yaml`
- Routing the Agent SDK through any Claude-compatible endpoint (MiniMax, Kimi, Moonshot, OpenAI-compat)
- Trade-offs vs the `claude` CLI provider

## Setup

```bash
export MINIMAX_API_KEY=sk-...      # see .env.example at the repo root
pnpm install
```

The bundled `.converge/project.yaml` routes the `acp` provider through MiniMax's Anthropic-compatible endpoint (`MiniMax-M2.7`).

## Run the SDK examples

```bash
cd examples/acp-demo
npx tsx src/example.ts
```

## Provider comparison

| Feature | `claude` (CLI) | `acp` (SDK) |
|---------|----------------|-------------|
| Backend | Spawns `claude` CLI | In-process Claude Agent SDK |
| Startup | ~1–2 s | ~0.5 s |
| MCP servers | Via config file | Programmatic |
| Session resume | `--resume` flag | Native SDK |
| Streaming | JSONL parsing | Native events |

## Provider config

```yaml
# .converge/project.yaml
ai:
  default: acp
  providers:
    acp:
      provider: acp
      apiKey: ${MINIMAX_API_KEY}
      baseUrl: ${ANTHROPIC_BASE_URL:-https://api.minimax.io/anthropic}
      model: ${ANTHROPIC_MODEL:-MiniMax-M2.7}
      timeoutMs: 3000000
```

## Structure

```
acp-demo/
├── .converge/
│   ├── project.yaml              # AI provider config (acp + claude, MiniMax)
│   └── playbooks/                # legacy SDK-step playbooks (reference only)
├── src/                          # TypeScript SDK usage examples
│   ├── example.ts
│   ├── claude-with-kimi.ts
│   └── test-kimi.ts
└── package.json
```
