# Provider Selection Guide

This guide helps you choose the right provider for your use case.

## Quick Decision Tree

```
Need tools (Read, Edit, Bash)?
├── YES → Can you use Kimi API?
│         ├── YES → Use claude+kimi (best value)
│         └── NO  → Use claude (Anthropic)
└── NO  → Need MCP servers?
          ├── YES → Use acp (Agent SDK)
          └── NO  → Simple text generation?
                    ├── YES → Use kimi (native, fastest setup)
                    └── NO  → Use acp (most flexible)
```

## Provider Options

### 1. `claude+kimi` - Recommended for Most Tasks

**What:** Claude CLI using Kimi's API endpoint

**Best for:**
- Code analysis with tools
- File editing workflows
- Session-based conversations
- Budget-conscious projects

**Setup:**
```bash
export ANTHROPIC_API_KEY=sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4
export ANTHROPIC_BASE_URL=https://api.moonshot.cn/v1
```

```typescript
const fn = agentfn({
  provider: "claude",
  cliFlags: ["--model", "kimi-k1.5"],
  allowedTools: ["Read", "Edit", "Bash"],
});
```

**Pros:**
- ✅ Full Claude CLI tool support
- ✅ Session resumption
- ✅ Sandbox mode
- ✅ Kimi pricing (cheaper!)
- ✅ No additional CLI install needed

**Cons:**
- ⚠️ Requires API endpoint override
- ⚠️ Some Claude-specific features may not work

---

### 2. `acp` - Advanced SDK Features

**What:** Native Agent SDK (`@anthropic-ai/claude-agent-sdk`)

**Best for:**
- MCP server integration
- Custom tool implementations
- Fine-grained control over SDK options
- Multi-turn conversations

**Setup:**
```bash
export ANTHROPIC_API_KEY=your_key
```

```typescript
const fn = agentfn({
  provider: "acp",
  mcpServers: { /* ... */ },
});
```

**Pros:**
- ✅ Native SDK features
- ✅ Programmatic MCP configuration
- ✅ Best streaming support
- ✅ Adaptive thinking

**Cons:**
- ⚠️ Anthropic pricing only
- ⚠️ No Kimi support

---

### 3. `kimi` (native) - Simple & Fast

**What:** Native Kimi CLI (`@moonshot-ai/kimi-cli`)

**Best for:**
- Quick text generation
- Simple Q&A
- When you don't need tools
- Fastest setup

**Setup:**
```bash
npm install -g @moonshot-ai/kimi-cli
export MOONSHOT_API_KEY=your_key
```

```typescript
const fn = agentfn({
  provider: "kimi",
});
```

**Pros:**
- ✅ Simplest setup
- ✅ Fast for text-only tasks
- ✅ Kimi pricing

**Cons:**
- ⚠️ No tool support
- ⚠️ No sessions
- ⚠️ Requires separate CLI install

---

### 4. `claude` (standard) - Full Power

**What:** Standard Claude CLI with Anthropic API

**Best for:**
- Maximum compatibility
- Production stability
- When you need guaranteed Claude behavior

**Setup:**
```bash
export ANTHROPIC_API_KEY=your_key
```

```typescript
const fn = agentfn({
  provider: "claude",
});
```

**Pros:**
- ✅ Full feature set
- ✅ Best compatibility
- ✅ Official support

**Cons:**
- ⚠️ Anthropic pricing (most expensive)

---

## Feature Comparison

| Feature | claude+kimi | acp | kimi | claude |
|---------|-------------|-----|------|--------|
| **Tools (Read/Edit/Bash)** | ✅ | ✅ | ❌ | ✅ |
| **MCP Servers** | ✅ Config | ✅ Native | ❌ | ✅ Config |
| **Sessions** | ✅ | ✅ | ❌ | ✅ |
| **Streaming** | ✅ | ✅ Best | ✅ | ✅ |
| **Sandbox** | ✅ | ✅ | ❌ | ✅ |
| **Schema Validation** | ✅ | ✅ | ✅ | ✅ |
| **Resume Session** | ✅ | ✅ | ❌ | ✅ |
| **Setup Complexity** | Low | Low | Medium | Low |
| **Pricing** | Kimi 💰 | Anthropic | Kimi 💰 | Anthropic |

## Code Examples

### Code Analysis with Tools

```typescript
// Option 1: claude+kimi (recommended)
const analyze = agentfn({
  provider: "claude",
  prompt: "Analyze {{input.file}} for bugs",
  cliFlags: ["--model", "kimi-k1.5"],
  allowedTools: ["Read", "Grep", "Bash"],
});

// Option 2: Standard Claude
const analyze = agentfn({
  provider: "claude",
  prompt: "Analyze {{input.file}} for bugs",
  allowedTools: ["Read", "Grep", "Bash"],
});
```

### Simple Text Generation

```typescript
// Option 1: kimi (fastest)
const generate = agentfn({
  provider: "kimi",
  prompt: "Write a summary of {{input}}",
});

// Option 2: claude+kimi
const generate = agentfn({
  provider: "claude",
  prompt: "Write a summary of {{input}}",
  cliFlags: ["--model", "kimi-k1"],  // Fast model
});
```

### MCP Integration

```typescript
// Option 1: acp (only option with native MCP)
const queryDb = agentfn({
  provider: "acp",
  prompt: "Query the database for {{input}}",
  mcpServers: {
    postgres: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/db"],
    },
  },
});

// Option 2: claude+kimi with config file
// Create ~/.claude/config.json with MCP servers
const queryDb = agentfn({
  provider: "claude",
  prompt: "Query the database for {{input}}",
  cliFlags: ["--model", "kimi-k1.5"],
});
```

### Session-Based Conversation

```typescript
// Option 1: claude+kimi (cheapest)
const assistant = agentfn({
  provider: "claude",
  prompt: "{{input}}",
  cliFlags: ["--model", "kimi-k1.5"],
});

const result1 = await assistant("Hello!");
const followUp = agentfn({
  provider: "claude",
  prompt: "{{input}}",
  cliFlags: ["--model", "kimi-k1.5"],
  resume: result1.sessionId,
});

// Option 2: acp (native sessions)
const assistant = agentfn({
  provider: "acp",
  prompt: "{{input}}",
});

const result1 = await assistant("Hello!");
const followUp = agentfn({
  provider: "acp",
  prompt: "{{input}}",
  resume: result1.sessionId,
});
```

## Environment Setup

### Kimi API Key (for claude+kimi)

```bash
# In your shell or .env file
export KIMI_API_KEY=sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4
export ANTHROPIC_API_KEY=$KIMI_API_KEY
export ANTHROPIC_BASE_URL=https://api.moonshot.cn/v1
```

### Playbook Configuration

```yaml
# .converge/playbooks/my-playbook/playbook.yml

# Use claude+kimi
env:
  ANTHROPIC_API_KEY: ${KIMI_API_KEY}
  ANTHROPIC_BASE_URL: https://api.moonshot.cn/v1

defaults:
  provider: claude
  cliFlags: ["--model", "kimi-k1.5"]

steps:
  - name: analyze
    task:
      type: agent
      provider: claude
      prompt: "Analyze this code"
      allowedTools: ["Read", "Edit"]
```

## Troubleshooting

### claude+kimi Issues

| Issue | Solution |
|-------|----------|
| `Invalid API key` | Check `ANTHROPIC_API_KEY` is set to Kimi key |
| `Connection refused` | Check `ANTHROPIC_BASE_URL` is set correctly |
| `Model not found` | Use Kimi model names: `kimi-k1`, `kimi-k1.5`, `kimi-k1.5-long` |
| `Tool not working` | Some tools may require Anthropic API; test with standard Claude first |

### Testing Your Setup

```bash
# Test claude+kimi
npx tsx src/claude-with-kimi-example.ts

# Test native kimi
npx tsx src/quick-test-kimi.ts

# Test acp
npx tsx src/example.ts  # Edit to use acp provider
```

## Migration Guide

### From `claude` to `claude+kimi`

1. Set environment variables:
   ```bash
   export ANTHROPIC_API_KEY=$KIMI_API_KEY
   export ANTHROPIC_BASE_URL=https://api.moonshot.cn/v1
   ```

2. Add model flag:
   ```typescript
   // Before
   const fn = agentfn({ provider: "claude", ... });
   
   // After
   const fn = agentfn({
     provider: "claude",
     cliFlags: ["--model", "kimi-k1.5"],
     ...
   });
   ```

### From `kimi` to `claude+kimi`

1. Remove kimi CLI dependency
2. Set environment variables (as above)
3. Change provider:
   ```typescript
   // Before
   const fn = agentfn({ provider: "kimi", ... });
   
   // After
   const fn = agentfn({
     provider: "claude",
     cliFlags: ["--model", "kimi-k1.5"],
     ...
   });
   ```
4. Add tools if needed:
   ```typescript
   allowedTools: ["Read", "Edit", "Bash"]
   ```
