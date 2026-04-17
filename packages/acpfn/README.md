# acpfn

**Claude as a function via Agent SDK** — call Claude programmatically with types and composition using the `@anthropic-ai/claude-agent-sdk`.

This package mirrors the API of `@crew/claudefn` but uses the Claude Agent SDK instead of spawning the CLI directly.

## Install

```bash
cd packages/acpfn && npm install
```

## Quick Start

### Simple function

```typescript
import { acpfn } from "@crew/acpfn";

const ask = acpfn({ prompt: "What is {{input}}?" });
const { data } = await ask("TypeScript");
// data: "TypeScript is a typed superset of JavaScript..."
```

### With schema validation

```typescript
import { acpfn } from "@crew/acpfn";
import { z } from "zod";

const analyze = acpfn({
  prompt: "Analyze this code: {{input}}",
  schema: z.object({
    issues: z.array(z.string()),
    score: z.number(),
  }),
});

const { data } = await analyze("const x = 1");
// data.issues: string[]
// data.score: number
```

## API

### `acpfn<T>(options): AcpFn<T>`

Create a callable async function backed by the Claude Agent SDK.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string \| (input?) => string` | — | Template with `{{input}}` placeholder |
| `schema` | `ZodType<T>` | — | Validate & parse JSON output |
| `hooks` | `AcpFnHooks` | — | `before`, `after`, `onStream` |
| `timeoutMs` | `number` | 600_000 | Abort after timeout |
| `maxRetries` | `number` | 0 | Retry on failure |
| `cwd` | `string` | — | Working directory |
| `allowedTools` | `string[]` | — | Restrict available tools |
| `queue` | `GlobalQueue \| boolean` | — | Rate limiting |
| `logDir` | `string` | **required** | Directory for log files |
| `model` | `string` | — | Model to use |
| `maxTurns` | `number` | — | Max agentic turns |
| `sdkOptions` | `Partial<Options>` | — | Additional SDK options |

### `compose<T>(options): (input?) => Promise<AcpFnResult<T>>`

Compose multiple `acpfn` functions as tools.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string \| (input?) => string` | **required** | User request |
| `tools` | `Record<string, ToolDef>` | **required** | `{ name: { fn, description } }` |
| `composeMode` | `"code" \| "tool_call"` | `"code"` | How Claude invokes tools |
| `schema` | `ZodType<T>` | — | Validate final output |
| `hooks` | `ComposeHooks` | — | Extended with `onToolCall` |
| `maxIterations` | `number` | 10 | Max tool-call rounds |

### `GlobalQueue`

Cross-process rate limiting and concurrency control using file-based locking.

```typescript
import { acpfn, GlobalQueue } from "@crew/acpfn";

const queue = new GlobalQueue({ maxConcurrent: 3, maxPerMinute: 30 });
const fn = acpfn({ prompt: "...", queue });

// Or use the default singleton:
const fn2 = acpfn({ prompt: "...", queue: true });
```

## Hooks

```typescript
const fn = acpfn({
  prompt: "Summarize: {{input}}",
  hooks: {
    before: ({ prompt }) => `[Be concise]\n${prompt}`,
    after: ({ result, durationMs }) => console.log(`Done in ${durationMs}ms`),
    onStream: (chunk) => process.stdout.write(chunk),
  },
});
```

## Commands

```bash
npm run build         # tsc → dist/
npm test              # vitest run
npm run typecheck     # tsc --noEmit
```

## Differences from @crew/claudefn

| Feature | @crew/claudefn | @crew/acpfn |
|---------|---------------|-------------|
| Backend | Spawns `claude` CLI | Uses `@anthropic-ai/claude-agent-sdk` |
| Process management | Manual spawn/kill | SDK-managed |
| Streaming | `--output-format stream-json` | Native SDK streaming |
| Session resume | `--resume` flag | SDK `resume` option |
| Permissions | `--dangerously-skip-permissions` | `allowDangerouslySkipPermissions` option |
| MCP servers | `--mcp-config` flag | `mcpServers` option |

## License

MIT
