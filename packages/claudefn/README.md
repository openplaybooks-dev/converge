# claudefn

**Claude as a function** — call Claude Code CLI programmatically with types and composition.

Spawns the `claude` binary as a subprocess with typed results, composition, and hooks.

## Install

```bash
cd packages/claudefn && pnpm install
```

## Quick Start

### Simple function

```typescript
import { claudefn } from "claudefn";

const ask = claudefn({ prompt: "What is {{input}}?" });
const { data } = await ask("TypeScript");
// data: "TypeScript is a typed superset of JavaScript..."
```

## API

### `claudefn<T>(options): ClaudeFn<T>`

Create a callable async function backed by the Claude CLI.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string \| (input?) => string` | — | Template with `{{input}}` placeholder |
| `schema` | `ZodType<T>` | — | Validate & parse JSON output |
| `hooks` | `ClaudeFnHooks` | — | `before`, `after`, `onStream` |
| `timeoutMs` | `number` | 120_000 | Kill after timeout |
| `maxRetries` | `number` | 0 | Retry on failure |
| `cwd` | `string` | — | Working directory |
| `allowedTools` | `string[]` | — | Restrict available tools |
| `queue` | `GlobalQueue \| boolean` | — | Rate limiting |
| `cliFlags` | `string[]` | — | Extra CLI flags |

### `compose<T>(options): (input?) => Promise<ClaudeFnResult<T>>`

Compose multiple `claudefn` functions as tools. Claude either writes executable code calling the tools or uses XML `<tool_call>` blocks.

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
import { claudefn, GlobalQueue } from "claudefn";

const queue = new GlobalQueue({ maxConcurrent: 3, maxPerMinute: 30 });
const fn = claudefn({ prompt: "...", queue });

// Or use the default singleton:
const fn2 = claudefn({ prompt: "...", queue: true });
```

## Hooks

```typescript
const fn = claudefn({
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
pnpm run build         # tsc → dist/
pnpm test              # vitest run
pnpm run typecheck     # tsc --noEmit
```
