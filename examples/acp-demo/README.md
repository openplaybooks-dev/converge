# ACP (Agent SDK) Provider Demo

This example demonstrates how to use the `@converge/scpfn` package via the `@converge/agentfn` unified interface with the `"acp"` provider.

## Overview

The ACP (Agent Claude Protocol) provider uses the `@anthropic-ai/claude-agent-sdk` instead of spawning the Claude CLI directly. This provides:

- **Native SDK integration**: Direct access to all Agent SDK features
- **Better session management**: Resume sessions natively
- **MCP server support**: Configure MCP servers programmatically
- **Streaming support**: Real-time message streaming
- **Structured outputs**: JSON schema validation

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

3. Run the example:
```bash
npx tsx src/example.ts
```

## Configuration

### Basic Usage

```typescript
import { agentfn, setDefaultProvider } from "@converge/agentfn";
import { z } from "zod";

// Set ACP as the default provider
setDefaultProvider("acp");

// Create a function
const analyze = agentfn({
  provider: "acp",  // Or omit if using default
  prompt: "Analyze: {{input}}",
  logDir: "./logs",
  schema: z.object({
    result: z.string(),
  }),
});

const { data } = await analyze("some code");
```

### MCP Servers

```typescript
const queryDb = agentfn({
  provider: "acp",
  prompt: "Query: {{input}}",
  mcpServers: {
    postgres: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/db"],
    },
  },
});
```

### Custom API URL and Key (e.g., Kimi)

The ACP provider supports custom API endpoints that are Claude-compatible:

```typescript
import { scpfn } from "@converge/scpfn";

// Use Kimi API via Agent SDK
const kimi = scpfn({
  prompt: "Analyze: {{input}}",
  logDir: "./logs",
  // Custom API configuration
  apiKey: "sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4",
  baseUrl: "https://api.moonshot.cn/v1",
  model: "kimi-k1.5",
});

const result = await kimi("some code");
```

**Benefits of ACP + Custom API:**
- Native SDK features with any Claude-compatible API
- Better streaming support than CLI-based approaches
- Programmatic MCP server configuration
- Session management

**Supported providers:**
- Kimi (Moonshot)
- Any OpenAI-compatible endpoint
- Custom Claude-compatible APIs

### Using Kimi Backend

#### Option 1: Native Kimi CLI (kimifn)

```typescript
import { agentfn } from "@converge/agentfn";

const kimiAssistant = agentfn({
  provider: "kimi",  // Use Kimi provider
  prompt: "{{input}}",
  timeoutMs: 120000,
  maxRetries: 2,
});

const result = await kimiAssistant("Explain TypeScript generics");
console.log(result.provider);  // "kimi"
```

#### Option 2: Claude CLI + Kimi API (Recommended)

Since Kimi's API is Claude-compatible, you can use `claudefn` (Claude CLI) with Kimi's API endpoint. This gives you Claude CLI's powerful features (tools, sandbox, sessions) with Kimi's pricing.

```typescript
import { agentfn } from "@converge/agentfn";

// Configure environment to use Kimi API
process.env.ANTHROPIC_API_KEY = "sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4";
process.env.ANTHROPIC_BASE_URL = "https://api.moonshot.cn/v1";

const kimiViaClaude = agentfn({
  provider: "claude",  // Use Claude CLI
  prompt: "{{input}}",
  cliFlags: ["--model", "kimi-k1.5"],  // Specify Kimi model
  allowedTools: ["Read", "Edit", "Bash"],  // Full tool support
});

const result = await kimiViaClaude("Analyze this codebase");
console.log(result.provider);  // "claude" (but using Kimi API)
```

**Benefits of Option 2:**
- Full Claude CLI tool support (Read, Edit, Bash, etc.)
- Session resumption (`--resume`)
- Sandbox mode
- Better error handling

**Configuration:**
```bash
# Set in your shell or .env file
export ANTHROPIC_API_KEY=sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4
export ANTHROPIC_BASE_URL=https://api.moonshot.cn/v1
```

Or use the playbook configuration:
```yaml
# .converge/playbooks/kimi-compat/playbook.yml
env:
  ANTHROPIC_API_KEY: ${KIMI_API_KEY}
  ANTHROPIC_BASE_URL: https://api.moonshot.cn/v1

steps:
  - name: analyze
    task:
      type: agent
      provider: claude
      model: kimi-k1.5
      prompt: "Analyze this code"
```

### Session Management (ACP only)

```typescript
const assistant = agentfn({
  provider: "acp",
  prompt: "{{input}}",
});

// First call
const result1 = await assistant("Hello!");
console.log(result1.sessionId);  // Save this

// Resume later
const followUp = agentfn({
  provider: "acp",
  prompt: "{{input}}",
  resume: result1.sessionId,
});

const result2 = await followUp("Follow-up question");
```

## Playbook Configuration

The `playbook.yml` file shows how to configure ACP provider in Converge playbooks:

```yaml
defaults:
  provider: acp
  model: claude-sonnet-4-6
  timeout: 300000

steps:
  - name: analyze
    task:
      type: agent
      provider: acp
      prompt: "Analyze this code"
      allowedTools: ["Read", "Edit"]
```

## Provider Comparison

| Feature | `claude` (CLI) | `claude+kimi` | `acp` (SDK) | `kimi` (native) |
|---------|---------------|---------------|-------------|-----------------|
| Backend | Spawns `claude` CLI | Claude CLI + Kimi API | Uses Agent SDK | Moonshot API |
| Speed | ~1-2s startup | ~1-2s startup | ~0.5s startup | ~1s startup |
| MCP Servers | Via config file | Via config file | Programmatic | Not supported |
| Session Resume | `--resume` flag | `--resume` flag | Native SDK | Not supported |
| Streaming | JSONL parsing | JSONL parsing | Native events | Basic |
| Sandbox | CLI flag | CLI flag | SDK option | N/A |
| Thinking | Limited | Limited | Full adaptive | Basic |
| Tools | Built-in | Built-in | Built-in + MCP | Limited |
| Pricing | Anthropic | Kimi (cheaper!) | Anthropic | Kimi |

**Recommendation:**
- Use **`claude+kimi`** for most tasks: Get Claude CLI's features with Kimi's pricing
- Use **`acp`** for advanced SDK features: MCP servers, native streaming
- Use **`kimi`** (native) for simple tasks without tool requirements

## File Structure

```
acp-demo/
├── .converge/
│   ├── config/
│   │   └── providers.yml       # Provider configuration
│   └── playbooks/
│       ├── default/
│       │   └── playbook.yml    # Default ACP playbook
│       └── kimi-compat/
│           └── playbook.yml    # Kimi via Claude CLI playbook
├── src/
│   ├── example.ts              # Main examples
│   ├── claude-with-kimi.ts     # Claude CLI + Kimi API module
│   ├── claude-with-kimi-example.ts  # Usage examples
│   ├── test-kimi.ts            # Kimi diagnostic tests
│   └── quick-test-kimi.ts      # Quick test
├── README.md
└── package.json
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (for ACP/Claude)
- `MOONSHOT_API_KEY` or `KIMI_API_KEY` - Your Moonshot/Kimi API key
- `CLAUDE_AGENT_SDK_CLIENT_APP` - Optional client identifier

## Testing Kimi Backend

Run the diagnostic test script to verify Kimi is working:

```bash
npx tsx src/test-kimi.ts
```

This will check:
1. ✓ `kimi` CLI is installed
2. ✓ API key is configured
3. ✓ Simple API call works
4. ✓ Schema validation works
5. ✓ Streaming works
6. ✓ Template input works

### Manual Kimi Test

Quick manual test without the diagnostic script:

```bash
# Check CLI is installed
which kimi

# Check API key
kimi config get apiKey
# or
export MOONSHOT_API_KEY=your_key_here

# Test a simple call
kimi -y --print -p "Say hello"
```

### Installing Kimi CLI

If `kimi` is not found:

```bash
npm install -g @moonshot-ai/kimi-cli

# Configure API key
kimi config set apiKey your_api_key_here
```

### Common Issues

| Issue | Solution |
|-------|----------|
| `kimi: command not found` | Install CLI: `npm install -g @moonshot-ai/kimi-cli` |
| `API key not configured` | Set `MOONSHOT_API_KEY` env var or run `kimi config set apiKey <key>` |
| `Request timeout` | Increase `timeoutMs` in options (default: 120000ms) |
| `Rate limit exceeded` | Add delay between calls or use queue |
| `Invalid JSON response` | Check schema matches expected output format |

## Troubleshooting

### Zod Version Mismatch

If you see errors about Zod types, ensure all packages use compatible Zod versions:

```bash
pnpm list zod
```

The scpfn package uses Zod v4 internally but accepts v3 schemas.

### Session Persistence

Sessions are stored in `~/.claude/projects/` by default. To disable:

```typescript
const fn = agentfn({
  provider: "acp",
  persistSession: false,  // Ephemeral session
});
```

## License

MIT
